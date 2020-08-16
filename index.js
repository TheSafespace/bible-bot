require('dotenv').config();

const Discord = require('discord.js');
const googletts = require('google-tts-api');
const _ = require('lodash');

const bibleApi = require('./bibleApi');

async function randomVerse(books) {
    const chapterIds = books.data.map(book => book.chapters.map(chapter => chapter.id)).flat();
    const randomChapterID = _.sample(chapterIds);

    const verses = await bibleApi.fetchVerses(randomChapterID);
    const verseIds = verses.data.map(verse => verse.id).flat();
    const randomVerse = _.sample(verseIds);

    const myVerse = await bibleApi.fetchVerseContent(randomVerse);
    return myVerse.data.content.trim();
}

const main = async () => {

    console.log("Starting BibleBot for Dicord....");

    const client = new Discord.Client();

    console.log("Pre-fetching books from bible API");
    const books = await bibleApi.fetchBooks();

    client.on('ready', () => {
      console.log(`Logged in to Discord as ${client.user.tag}!`);
    });

    client.on('message', async msg => {
      if (msg.content === '!bible') {
        msg.reply(await randomVerse(books));
      }

      if (msg.content === '!biblejoin') {
        if (msg.member.voice.channel) {
          googletts(await randomVerse(books), 'de', 1)
            .then(async function (url) {
              console.log(url);
              const connection = await msg.member.voice.channel.join();
              const dispatcher = connection.play(url);
              dispatcher.on('finish', () => {
                dispatcher.destroy();
              });
              connection.disconnect();
          });
        } else {
          msg.reply("Du bist nicht im Channel");
        }
      }
    });
    client.login(process.env.DISCORD_BOT_TOKEN);
}

main();
