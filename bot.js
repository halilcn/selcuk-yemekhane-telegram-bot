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

//TODO: Her gün kendisi menüyü mesaj atsın ?

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
  const todayMenu = getMenuByDate(dayjs());

  if (typeof todayMenu == 'undefined') return '😕 Haftasonu ve resmi tatillerde yemekhane kapalı olur.';

  return convertToList(todayMenu);
}

//TODO:!
function getMenuByDate(date2) {
  date2 = convertDateFormat(date2);

  return menu.find(({ date }) => {
    return date === date2;
  });
}

async function getMenuOfWeek() {
  const DAY_COUNT_OF_WEEK = 7;
  let menusOfWeek = [];

  let startDateOfWeek = dayjs().startOf('week');

  //TODO: Rewrite
  for (let i = 1; i < DAY_COUNT_OF_WEEK; i++) {

    //TODO:!
    const menu = getMenuByDate(startDateOfWeek);
    if (typeof menu != 'undefined') {
      menusOfWeek.push(menu);
    }

    startDateOfWeek = startDateOfWeek.add(1, 'day');
  }

  //TODO:!
  let test = '';
  menusOfWeek.forEach(item => {
    test += `${convertToList(item)}`;
  });

  return test;
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
