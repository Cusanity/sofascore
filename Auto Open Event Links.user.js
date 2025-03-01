// ==UserScript==
// @name         Auto Open Event Links
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  每10秒点击所有未点击的 <a data-testid="event_cell">，支持动态加载，并自动滚动加载
// @author       ChatGPT
// @match        https://www.sofascore.com/zh/*/2025-*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const categoryList = [
        "football", "american-football", "basketball", "baseball", "ice-hockey",
        "tennis", "table-tennis", "esports", "handball", "volleyball",
        "cricket", "rugby", "darts", "snooker", "futsal", "minifootball", "badminton",
        "waterpolo", "floorball", "bandy"
    ];
    let showAllButtonCount = 0;
    let allowedSecondsBeforeRedirection = 60;
    if (window.location.href.includes("football")) {
      allowedSecondsBeforeRedirection = 300;
    }

    function getNextCategory(current) {
        let index = categoryList.indexOf(current);
        if (index === -1 || index === categoryList.length - 1) {
            return "";
        }
        return categoryList[index + 1];
    }
    // 获取 URL 的最后一部分（通常是日期）
    const urlParts = window.location.pathname.split("/");
    const lastSegment = urlParts[urlParts.length - 1];

    // 获取当前分类
    let currentCategory = urlParts[2] || "football"; // 例如 football
    let nextCategory = getNextCategory(currentCategory);

    // 检查是否是 YYYY-MM-DD 格式的日期
    const urlDateMatch = lastSegment.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let todayKey;
    if (urlDateMatch) {
        todayKey = `${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`;
    } else {
        const now = new Date();
        todayKey = now.toISOString().split("T")[0];
    }

    let openedLinks = JSON.parse(localStorage.getItem("openedLinks")) || {};
    let lastRemainingCount = null;
    let stagnationCount = 0;

   function cleanOldLinks() {
        let updatedLinks = {};
        for (let date in openedLinks) {
            if (new Date(date) >= new Date(todayKey)) {
                // 只保留今天及以后的数据
                updatedLinks[date] = openedLinks[date];
            }
        }
        openedLinks = updatedLinks;
        saveOpenedLinks();
    }

    function createStatusBox() {
        let statusBox = document.createElement("div");
        statusBox.id = "statusBox";
        statusBox.style.position = "fixed";
        statusBox.style.top = "50px";
        statusBox.style.right = "10px";
        statusBox.style.zIndex = "9999";
        statusBox.style.padding = "10px";
        statusBox.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        statusBox.style.color = "white";
        statusBox.style.borderRadius = "8px";
        statusBox.style.fontSize = "14px";
        statusBox.style.fontWeight = "bold";
        statusBox.innerText = "剩余链接: 0";
        document.body.appendChild(statusBox);
    }

    function createRedirectStatusBox() {
        let statusBox = document.createElement("div");
        statusBox.id = "redirectBox";
        statusBox.style.position = "fixed";
        statusBox.style.top = "90px";
        statusBox.style.right = "10px";
        statusBox.style.zIndex = "9999";
        statusBox.style.padding = "10px";
        statusBox.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        statusBox.style.color = "white";
        statusBox.style.borderRadius = "8px";
        statusBox.style.fontSize = "14px";
        statusBox.style.fontWeight = "bold";
        statusBox.innerText = "Redirect: 0";
        document.body.appendChild(statusBox);
    }

    function updateStatusBox(count, stagCheck) {
        let statusBox = document.getElementById("statusBox");
        if (statusBox) {
            statusBox.innerText = `剩余链接: ${count}`;
        }
        if(stagCheck){
          checkStagnation(count);
        }
    }

    function updateRedirectBox(count) {
        let statusBox = document.getElementById("redirectBox");
        if (statusBox) {
            statusBox.innerText = `Redirect: ${count}`;
        }
    }


    function checkStagnation(count) {
        return;
        if (lastRemainingCount === count) {
            stagnationCount++;
            console.warn(`⚠️ 链接数量未变化 ${stagnationCount} 次`);
            if (stagnationCount >= 3) {
                console.warn(`🚀 3 次未变化，跳转到下一个分类：${nextCategory}`);
                window.location.href = `https://www.sofascore.com/zh/${nextCategory}/${todayKey}`;
            } else {
                setTimeout(doNext, 1000); // 强制执行
            }
        } else {
            stagnationCount = 0; // 重置计数
        }
        lastRemainingCount = count;
    }

    // setInterval(() => {
    //     updateStatusBox(openedLinks.length, true);
    // }, 60000); // 每 60 秒检查一次


    // 确保今天的 key 存在，并且值是数组
    if (!Array.isArray(openedLinks[todayKey])) {
        openedLinks[todayKey] = [];
    }

    cleanOldLinks(); // 每次运行时清理过期数据

    function saveOpenedLinks() {
        localStorage.setItem("openedLinks", JSON.stringify(openedLinks));
    }

    let intervalId = null; // 存储定时器 ID

    function createButton() {
        let btn = document.createElement("button");
        btn.innerText = "开始顺序点击链接";
        btn.style.position = "fixed";
        btn.style.top = "10px";
        btn.style.right = "10px";
        btn.style.zIndex = "9999";
        btn.style.padding = "10px";
        btn.style.backgroundColor = "blue";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        document.body.appendChild(btn);

        btn.addEventListener("click", startClickingLinks);
        setTimeout(() => { btn.click(); }, 5000);
    }

    function startClickingLinks() {
        if (intervalId) {
            alert("脚本已经在运行...");
            return;
        }
        setTimeout(doNext, 1000);
    }

    function doNext(linkURL) {
        const allVisibleLinks = Array.from(document.querySelectorAll('a[data-testid="event_cell"]'));
        let remainingLinks = allVisibleLinks
            .filter(link => {
                // 1. 排除 "已结束" 的比赛
                if (link.innerText.includes("已结束")) return false;

                // 2. 排除已经有比分的比赛（left_score 和 right_score 存在）
                if (link.querySelector('[data-testid="left_score"]') && link.querySelector('[data-testid="right_score"]')) {
                    return false;
                }

                if (link.querySelector('[color="sofaSingles.live"]')) {
                    return false;
                }

                return true; // 其他比赛继续保留
            })
            .map(link => link.getAttribute('href'))
            .filter(href => href && !openedLinks[todayKey].includes(href) && href !== linkURL);

        updateStatusBox(remainingLinks.length, false);

        if (remainingLinks.length === 0) {
            allVisibleLinks.at(-1)?.scrollIntoView({ behavior: "smooth", block: "center" });
            clickShowAllButton(showAllButtonCount++);
            return;
        }

        let linkElement = document.querySelector(`a[href="${remainingLinks[0]}"]`);
        if (!linkElement) return;

        linkElement.scrollIntoView({ behavior: "smooth", block: "center" });
        linkElement.click();
        setTimeout(() => {findLowestOdds(remainingLinks[0])}, 100);
    }

    function findLowestOdds(linkURL) {
        // 直接选择 data-testid="predictions" 的元素，提高查询效率
        let predictionsElement = document.querySelector('[data-testid="predictions"]');

        // 如果该元素存在，并且内部文本包含 "你的投票"，说明已经投过票，直接跳过
        if (predictionsElement && (predictionsElement.innerText.includes("你的投票") || predictionsElement.innerText.includes("投票结束"))) {
            openedLinks[todayKey].push(linkURL);
            setTimeout(() => {doNext(linkURL)}, 1000);
            return;
        }
        setTimeout(() => {
            let oddsElements = document.querySelectorAll('[data-testid="odds_choice"]');
            let options = document.querySelectorAll('[data-testid="prediction_option"]');

            if (!oddsElements.length && !options.length) {
                setTimeout(() => {doNext(linkURL)}, 1000);
                return;
            }

            if (oddsElements.length > 0) {
                let firstParent = oddsElements[0].parentElement;
                oddsElements = Array.from(oddsElements).filter(el => el.parentElement === firstParent);
            }

            let lowestIndex = -1;
            let lowestOdds = Infinity;

            oddsElements.forEach((el, index) => {
                let oddsSpans = Array.from(el.querySelectorAll('span'));
                let oddsSpan = oddsSpans.reverse().find(span => span.innerText.match(/^[+-]\d+$/));
                let oddsText = oddsSpan ? oddsSpan.innerText : null;

                if (oddsText) {
                    let oddsValue = parseInt(oddsText, 10);
                    if (!isNaN(oddsValue) && oddsValue < lowestOdds) {
                        lowestOdds = oddsValue;
                        lowestIndex = index;
                    }
                }
            });

            let isRandom = false;
            if (lowestIndex < 0 || lowestIndex >= options.length) {
                lowestIndex = Math.random() < 0.5 ? 0 : options.length - 1;
                isRandom = true;
            }
            if(options.length === 0 || !options[lowestIndex]){
                setTimeout(doNext, 1000);
                return;
            }
            let selectedOption = Array.from(options[lowestIndex].querySelectorAll('div.Text'))
                .find(div => div.innerText.trim().length > 0);

            if (selectedOption) {
                selectedOption.click();
                openedLinks[todayKey].push(linkURL); // 添加新链接
                saveOpenedLinks();
                setTimeout(() => {
                    voteOnPredictions(lowestIndex, isRandom, 1);
                }, 2000);
            }
        }, 2400)
    }

    function voteOnPredictions(lowestIndex, isRandom, tabIndex) {
        let nextButton = document.querySelector('button[data-testid="navigation-arrow-next"]:not([disabled])');
        if(!nextButton){
          setTimeout(doNext, 800);
          return;
        }
        const backUpLowestIndex = lowestIndex;
        nextButton.click();
        setTimeout(() => {
          let options = document.querySelectorAll('[data-testid="prediction_option"]');

          if (options.length > 0) {
                while(!isRandom && lowestIndex >= options.length){
                  lowestIndex /= 2;
                }
                if(isRandom){
                  if(tabIndex === 1){
                    lowestIndex = 0;
                  }
                  else{
                    lowestIndex = Math.random() < 0.5 ? 0 : options.length - 1;
                  }
                }
                let selectedOption = options[lowestIndex].querySelector('div.Text');

                if (selectedOption) {
                    setTimeout(() => {
                        selectedOption.click();
                        setTimeout(() => {voteOnPredictions(backUpLowestIndex, isRandom, tabIndex + 1)}, 1200); // 2 秒后尝试下一轮投票
                    }, 500);
                } else {
                }
            } else {
            }
          }, 800
        )
    }

    function isElementInViewport(el) {
        let rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
    }

    function clickShowAllButton(showAllButtonCount) {
        updateRedirectBox(allowedSecondsBeforeRedirection - showAllButtonCount);
        let showAllButton = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes("显示所有"));
        if (showAllButton) {
            console.log("点击 '显示所有' 按钮...");
            showAllButton.click();
        } else {
          if(nextCategory === ""){
            window.close();
            return;
          }
          if(showAllButtonCount > allowedSecondsBeforeRedirection){
            window.open(`https://www.sofascore.com/zh/${nextCategory}/${todayKey}`, "_self")
            return;
          }
        }
        setTimeout(doNext, 1000);
    }

    createButton();
    createStatusBox();
    createRedirectStatusBox();
})();
