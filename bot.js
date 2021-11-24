const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const { Telegraf } = require('telegraf');
const CronJob = require('cron').CronJob;

require('dotenv').config();

require('dayjs/locale/tr');
dayjs.locale('tr');

const bot = new Telegraf(process.env.TELEGRAM_CHANNEL_ID);
const menu = [];

const getMenuJob = new CronJob('30 5 * * *', async () => {
  console.log('Cron started...');
  await setMenuOfMonth();
  console.log('Cron finished...');
});

async function setMenuOfMonth() {
  let menuData = {
    date: '',
    foods: [],
    totalCalorieText: ''
  };

  console.log('Menu started to be taken from the page...');
  const { data } = await axios.get(process.env.MENU_URL);
  const $ = cheerio.load(data);

  $('.table-fixed tr:not(:first)').each((index, element) => {
    $(element).children('td').each((index, element) => {
      // Date
      menuData.date = $(element).children('h4').text().trim();

      $(element).find('.row:first ul li').each((index, element) => {
        // Foods
        menuData.foods.push($(element).text().trim().slice(','));
      });

      // Calori
      menuData.totalCalorieText = $(element).find('.row:last b').text().trim();

      menu.push({ ...menuData });

      // Clear menu of day
      menuData = {
        date: '',
        foods: [],
        totalCalorieText: ''
      };
    });
  });

  console.log('Getting the menu from the page is finished...');
  console.log(`Total days of menu: ${menu.length}`);
}

async function getTodayMenu() {
  const todayMenu = await getMenuByDate(dayjs());

  if (typeof todayMenu == 'undefined') return '😕 Haftasonu ve resmi tatillerde yemekhane kapalı olur.';

  return convertToList(todayMenu);
}

async function getMenuOfWeek() {
  const DAY_COUNT_OF_WEEK = 7;
  const menuOfWeek = [];
  let menu = null;
  let startDateOfWeek = dayjs().startOf('week');

  for (let i = 1; i < DAY_COUNT_OF_WEEK; i++) {
    menu = await getMenuByDate(startDateOfWeek);
    if (typeof menu != 'undefined') menuOfWeek.push(menu);
    startDateOfWeek = startDateOfWeek.add(1, 'day');
  }

  let convertedList = '';
  menuOfWeek.forEach(item => {
    convertedList += convertToList(item);
  });

  return convertedList;
}

async function getMenuByDate(menuDate) {
  menuDate = convertDateFormat(menuDate);

  return await menu.find(({ date }) => {
    return date === menuDate;
  });
}

function convertToList(menu) {
  return `
⏰ ${menu.date}
🍽 ${menu.foods.slice(',')}
🎯 ${menu.totalCalorieText}`;
}

function convertDateFormat(date) {
  return date.format('D MMMM');
}

async function startBot() {
  bot.start(async ctx => {
    ctx.reply(`
/bugun - Bugünün menüsünü getirir.
/hafta - Haftanın menüsün getirir.
/github - Proje kaynağını getirir.
    `);
  });

  bot.command('bugun', async (ctx) => {
    ctx.reply(await getTodayMenu());
  });

  bot.command('hafta', async (ctx) => {
    ctx.reply(await getMenuOfWeek());
  });

  bot.launch();
}

async function runBot() {
  await setMenuOfMonth();
  await startBot();
  getMenuJob.start();
}

runBot();
