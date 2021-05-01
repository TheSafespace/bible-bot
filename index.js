require('dotenv').config();

const fs = require('fs');
const crypto = require('crypto');
const _ = require('lodash');

const Discord = require('discord.js');
const msSDK = require('microsoft-cognitiveservices-speech-sdk');
const bibleApi = require('./bibleApi');

const getRandomVerse = async (books) => {
  const chapterIds = books.data.map((book) => book.chapters).flat();
  const randomChapter = _.sample(chapterIds);
  const randomChapterID = randomChapter.id;

  const chapterNumber = randomChapter.number;
  const bookName = books.data.find((book) => book.id === randomChapter.bookId)
    .nameLong;

  let verses = await bibleApi.fetchVerses(randomChapterID);
  verses = verses.data.flat();
  const randomVerse = _.sample(verses);

  const verseNumber = randomVerse.id.split('.').pop();

  const myVerse = await bibleApi.fetchVerseContent(randomVerse.id);
  return {
    content: myVerse.data.content.trim(),
    bookName,
    chapterNumber,
    verseNumber,
  };
};

const getSHA256 = (input) =>
  crypto.createHash('sha256').update(input).digest('hex');

const synthesizeSpeech = async (text, output, language, voiceName) => {
  const speechConfig = msSDK.SpeechConfig.fromSubscription(
    process.env.COGNITIVE_SERVICES_APIKEY,
    process.env.COGNITIVE_SERVICES_REGION,
  );

  speechConfig.speechSynthesisLanguage = language;
  speechConfig.speechSynthesisVoiceName = voiceName;
  speechConfig.speechSynthesisOutputFormat =
    msSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  const audioConfig = msSDK.AudioConfig.fromAudioFileOutput(
    `./tts/${output}.wav`,
  );

  let synthesizer = new msSDK.SpeechSynthesizer(speechConfig, audioConfig);

  synthesizer.speakTextAsync(
    text,
    (result) =>
      new Promise((resolve, reject) => {
        if (result.reason === msSDK.ResultReason.SynthesizingAudioCompleted) {
          console.log('synthesis finished.');
          resolve();
        } else {
          console.error(
            `Speech synthesis canceled, ${result.errorDetails}\nDid you update the subscription info?`,
          );
          reject();
        }
        synthesizer.close();
        synthesizer = undefined;
      }),
    (error) => {
      console.trace(`err - ${error}`);
      synthesizer.close();
      synthesizer = undefined;
    },
  );
  console.log('Finished Synthesis');
};

const main = async () => {
  console.log('Starting BibleBot for Discord....');

  console.log('Creating TTS directory');
  fs.mkdirSync('./tts', { recursive: true });

  console.log('Initializing Discord Client');
  const client = new Discord.Client();

  console.log('Pre-fetching books from bible API');
  const books = await bibleApi.fetchBooks();

  client.on('ready', () => {
    console.log(`Logged in to Discord as ${client.user.tag}!`);
  });

  client.on('message', async (msg) => {
    if (msg.content === '!bible') {
      const bibleResult = await getRandomVerse(books);
      msg.reply(
        `${bibleResult.content} ~ ${bibleResult.bookName}, Kapitel ${bibleResult.chapterNumber}, Vers ${bibleResult.verseNumber}`,
      );
    }

    if (msg.content === '!biblejoin') {
      if (msg.member.voice.channel) {
        const bibleResult = await getRandomVerse(books);
        const text = `${bibleResult.bookName}, Kapitel ${bibleResult.chapterNumber}, Vers ${bibleResult.verseNumber} lautet: ${bibleResult.content}. Amen!`;
        const path = `./tts/${getSHA256(text)}.wav`;
        if (!fs.existsSync(path))
          await synthesizeSpeech(
            text,
            getSHA256(text),
            'de-DE',
            'de-DE-ConradNeural',
          );

        msg.reply(
          `${bibleResult.content} ~ ${bibleResult.bookName}, Kapitel ${bibleResult.chapterNumber}, Vers ${bibleResult.verseNumber}`,
        );
        msg.member.voice.channel.join().then((connection) => {
          const dispatcher = connection.play(path);
          dispatcher.on('finish', () => {
            dispatcher.destroy();
            connection.disconnect();
          });
        });
      } else {
        msg.reply('Du bist nicht im Channel');
      }
    }
  });
  client.login(process.env.DISCORD_BOT_TOKEN);
};

main();
