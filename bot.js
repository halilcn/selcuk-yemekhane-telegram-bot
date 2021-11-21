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

/*
* menu.push({
  date: '21 Kasım',
  foods: ['adasdsad asd', 'asdasdadoa ksdkaod', 'afasdaps dl'],
  totalCalorieText: '12121 Kalori'
});
*/

const getMenuJob = new CronJob('0 5 * * * *', function () {
  console.log('You will see this message every second');
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

      menuData.date = '';
      menuData.foods = [];
      menuData.totalCalorieText = '';
    });
  });

  console.log('Menu finished...');
  console.log(`Total days of menu: ${menu.length}`);
}

async function getTodayMenu() {
  const today = dayjs().format('D MMMM');

  const todayMenu = menu.find(({ date }) => {
    return date === today;
  });

  if (typeof todayMenu == 'undefined') {
   return 'menü yok'
  }

  return test(todayMenu);
}

async function getMenuOfWeek() {
}

function test(menu) {
  return `
⏰ ${menu.date}
🍽 ${menu.foods.slice(',')}
🎯 ${menu.totalCalorieText}`;
}

async function startBot() {
  // TODO: günlük,haftalık menü
  // TODO: async function kaldırılabilir mi ?
  bot.start(async ctx => {
    ctx.reply('bilgilendirme');
  });

  bot.command('bugun', async (ctx) => {
    const menu = await getTodayMenu();
    ctx.reply(menu);
  });

  bot.command('haftalik', async (ctx) => {
    const menu = await getMenuOfWeek();
    ctx.reply(menu);
  });

  bot.launch();
}

async function runBot() {
  await setMenuOfMonth();
  await startBot();
  getMenuJob.start();
}

runBot();