import { launch, Browser, Page, ElementHandle } from "puppeteer";
import { JSDOM } from "jsdom";
import { readFile, writeFile } from "fs";

let browser: Browser;

export async function browserClose() {
  await browser.close();
}

export const ROOT_PATH = __dirname + "/../../";

async function launchBrowser(args?) {
  let configuration = {
    userDataDir: ROOT_PATH + "data",
    headless: true,
    executablePath: "/Applications/Chromium.app/Contents/MacOS/Chromium",
    defaultViewport: null,
    args: ["--window-size=1920,1080"],
  };

  if (args) {
    configuration = {
      ...configuration,
      ...args,
    };
  }

  browser = await launch(configuration);
}

async function getBrowser() {
  if (!browser) {
    await launchBrowser();
  }

  return browser;
}

export async function getPage(): Promise<Page> {
  if (!browser) {
    throw new Error("No browser initialted yet");
  }

  let [page] = await browser.pages();
  if (!page) {
    page = await browser.newPage();
  }

  return page;
}

async function login() {
  console.log("login...");

  await getBrowser();

  let page = await getPage();
  console.log("goto https://trello.com/login...");
  await page.goto("https://trello.com/login", {
    timeout: 30000,
    waitUntil: "networkidle2",
  });

  console.log("set username...");
  await page.evaluate(() => {
    const username = document.querySelector(".form-field#user");
    username.setAttribute("value", "<username>");
  });

  await page.click("input#login");
  console.log("goto main page...");
  await page.waitForSelector("div.all-boards", { visible: true });

  // const url = page.url();
  // if (url !== "https://trello.com/<username>/boards") {
  //   console.log("here");

  //   await page.evaluate(() => {
  //     const password = document.querySelector("input#password");
  //     password.setAttribute("value", "<password>");
  //   });
  //   await page.click("button#login-submit");
  //   await page.waitForTimeout(10000);
  // }

  console.log("goto interview page...");
  await page.goto("<trello_board_url>", {
    timeout: 30000,
    waitUntil: "networkidle2",
  });

  return page;
}

const getAllCardNames = async (page: Page) => {
  const cards = await page.evaluate((selector) => {
    let elements = document.querySelectorAll(selector);
    return Array.from(elements).map((e) => e.textContent);
  }, "a.list-card.js-member-droppable.ui-droppable");

  return cards;
};

const addNewCard = async (page: Page, link) => {
  console.log("addNewCard start");

  await page.waitForSelector("a.open-card-composer.js-open-card-composer", {
    visible: true,
  });
  await page.click("a.open-card-composer.js-open-card-composer");
  await page.waitForTimeout(100);

  await page.waitForSelector(
    "textArea.list-card-composer-textarea.js-card-title",
    { visible: true }
  );
  await page.evaluate((link) => {
    const newCard = document.querySelector(
      "textArea.list-card-composer-textarea.js-card-title"
    );
    newCard.textContent = link.title;
  }, link);
  await page.waitForTimeout(100);
  console.log("addNewCard end");
};

const openCardEditDialog = async (page: Page) => {
  console.log("openCardEditDialog start");

  await page.waitForSelector(
    "input.nch-button.nch-button--primary.confirm.mod-compact.js-add-card",
    { visible: true }
  );
  await page.click(
    "input.nch-button.nch-button--primary.confirm.mod-compact.js-add-card"
  );
  await page.waitForTimeout(100);

  await page.waitForSelector(
    "a.list-card.js-member-droppable.ui-droppable:last-of-type",
    { visible: true }
  );
  await page.click("a.list-card.js-member-droppable.ui-droppable:last-of-type");
  await page.waitForTimeout(100);

  console.log("openCardEditDialog end");
};

const attachLinkHref = async (page: Page, href) => {
  console.log("attachLinkHref start");

  await page.waitForSelector("a.button-link.js-attach", { visible: true });
  await page.click("a.button-link.js-attach");
  await page.waitForTimeout(100);

  await page.evaluate((href) => {
    const newCard = document.querySelector("input#addLink");
    newCard.setAttribute("value", href);
  }, href);
  await page.waitForTimeout(100);

  await page.waitForSelector("input.js-add-attachment-url", {
    visible: true,
  });
  await page.click("input.js-add-attachment-url");
  await page.waitForTimeout(1000);

  console.log("attachLinkHref end");
};

const selectLabel = async (page: Page, name) => {
  console.log("selectLabel start");

  try {
    await page.waitForSelector("a.js-edit-labels", { visible: true });
    await page.click("a.js-edit-labels");
    await page
      .waitForSelector("input.js-label-search", { visible: true })
      .then(() => page.type("input.js-label-search", name, { delay: 200 }));

    await page.waitForTimeout(100);

    await page.waitForSelector("span.card-label.js-select-label", {
      visible: true,
    });
    await page.click("span.card-label.js-select-label");
    await page.waitForTimeout(100);

    await page.waitForSelector(
      "a.pop-over-header-close-btn.icon-sm.icon-close"
    );
    await page.click("a.pop-over-header-close-btn.icon-sm.icon-close");
    await page.waitForTimeout(100);
  } catch (e) {
    console.log("cannot select label");
  } finally {
    console.log("selectLabel end");
  }
};

const closeDialog = async (page: Page) => {
  console.log("closeDialog start");

  await page.waitForSelector("div.u-clearfix.js-attachment-list.ui-sortable", {
    visible: true,
  });

  await page.waitForSelector(
    "a.icon-md.icon-close.dialog-close-button.js-close-window",
    { visible: true }
  );
  await page.click("a.icon-md.icon-close.dialog-close-button.js-close-window");
  console.log("closeDialog end");
};

(async () => {
  const name = "<name>";

  let res = [];

  readFile(
    `<path_to_htmls_directory>/${name}.html`,
    "utf8",
    function (err, data) {
      if (err) {
        return console.log(err);
      }
      const dom = new JSDOM(data, { includeNodeLocations: true });

      const figures = Array.from(
        dom.window.document.querySelectorAll("figure")
      );
      figures.forEach((figure) => {
        const id = figure.getAttribute("id");
        const title = figure
          .getElementsByClassName("bookmark-title")[0]
          .textContent.trim()
          .split("\n")
          .join();
        const href = figure.querySelector("a").getAttribute("href");

        res.push({ id, title, href });
      });

      // const fileName = `${__dirname}/data/${name}.json`;

      // writeFile(fileName, JSON.stringify(res), (err) => {
      //   if (err) {
      //     console.log(err);
      //   }
      // });
    }
  );

  let page = await login();

  const cardNames = await getAllCardNames(page);

  for (let i = 0; i < res.length; i++) {
    const link = res[i];
    console.log("link", i + 1, "/", res.length, link.title);
    if (cardNames.every((name) => !name.includes(link.title))) {
      await addNewCard(page, link);
      await openCardEditDialog(page);
      await attachLinkHref(page, link.href);
      await selectLabel(page, name);
      await closeDialog(page);
      console.log("___________");
    } else {
      console.log("skipped");
    }
  }
  await browserClose();
})();
