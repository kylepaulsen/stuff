{
    const corsProxy = 'https://cors-anywhere.herokuapp.com/';
    const get = function(object, path, defaultVal = undefined) {
        const pathParts = path.replace(/\]/g, '').split(/\.|\[/);
        let current = object;
        for (let x = 0, len = pathParts.length; x < len; x++) {
            if (current) {
                current = current[pathParts[x]];
            } else {
                return defaultVal;
            }
        }
        if (current === undefined) {
            return defaultVal;
        }
        return current;
    };

    const cooldownTime = 1000;
    const cooldownQueue = [];
    let lastRequest = 0;
    let requestInProgress = false;
    const getJson = (url) => new Promise((res) => {
        cooldownQueue.push({url, res});

        const next = () => {
            const timeToWait = Math.max(cooldownTime - (Date.now() - lastRequest), 0);
            requestInProgress = true;
            setTimeout(() => {
                const {url, res} = (cooldownQueue.shift() || {});
                if (url) {
                    lastRequest = Date.now();
                    console.log('fetching url: ', url);
                    fetch(url).then(d => d.json()).then(data => {
                        res(data);
                        requestInProgress = false;
                        if (cooldownQueue.length) {
                            next();
                        }
                    }).catch(e => {
                        console.error(e, e.trace);
                        res(null);
                        requestInProgress = false;
                        if (cooldownQueue.length) {
                            next();
                        }
                    });
                }
            }, timeToWait);
        };

        if (!requestInProgress && cooldownQueue.length === 1) {
            next();
        }
    });

    async function getHistoricStockData(symbol, startDate, endDate) {
        if (endDate === undefined) {
            endDate = Date.now();
        }
        if (startDate === undefined) {
            const d = new Date();
            d.setFullYear(d.getFullYear() - 1);
            startDate = d.getTime();
        }
        endDate = Math.floor(endDate / 1000);
        startDate = Math.floor(startDate / 1000);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?formatted=true&lang=en-US&region=US&period1=${startDate}&period2=${endDate}&interval=1d`;
        const data = await getJson(corsProxy + url);
        return get(data, 'chart.result[0]') || null;
    }

    async function getHistoricClosePrices(symbol, daysAgo = 365) {
        const data = await getHistoricStockData(symbol, Date.now() - daysAgo * 24 * 60 * 60 * 1000, Date.now());
        let closePrices = null;
        if (data) {
            closePrices = get(data, 'indicators.quote[0].close');
        }
        return closePrices;
    }
    window.getHistoricClosePrices = getHistoricClosePrices;

    async function getStockQuote(symbol) {
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;
        const data = await getJson(corsProxy + url);
        const price = get(data, 'quoteSummary.result.0.price.regularMarketPrice.raw');
        console.log(data, price);
        return price;
    }

    async function getStockGraph(symbol) {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m`;
        const data = await getJson(corsProxy + url);
        // const timestamps = get(data, 'chart.result[0].timestamp') || [];
        const previousClose = get(data, 'chart.result[0].meta.previousClose');
        const prices = get(data, 'chart.result[0].indicators.quote[0].close') || [];
        return { prices, previousClose };
    }

    function getUI(el) {
        const ui = {};
        const uiEls = el.querySelectorAll('[data-ui]');
        for (let uiEl of uiEls) {
            ui[uiEl.dataset.ui] = uiEl;
        }
        return ui;
    }

    function instanceTemplate(template) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = template;
        const el = tempDiv.children[0];
        const ui = getUI(el);
        return {el, ui};
    }

    function drawGraph(polyLine, data) {
        const drawboxWidth = 100;
        const drawboxHeight = 100;
        const previousClose = data.previousClose;
        let upperLimit = previousClose * 1.01;
        let lowerLimit = previousClose * 0.99;
        data.prices.forEach(p => {
            if (p > upperLimit) {
                upperLimit = p;
                lowerLimit = previousClose * (2 - upperLimit / previousClose);
            } else if (p < lowerLimit) {
                lowerLimit = p;
                upperLimit = previousClose * (2 - lowerLimit / previousClose);
            }
        });
        const range = upperLimit - lowerLimit;
        const priceToY = (price) => {
            const p = Math.min(Math.max((price - lowerLimit) / range, 0), 1);
            return Math.round((1 - p) * drawboxHeight);
        };
        const xStep = drawboxWidth / (6.5 * 60 / 5); // 6.5 hours, 5 min interval
        let points = [];
        for (let x = 0, len = data.prices.length; x < len; x++) {
            points.push(Math.round(x * xStep), priceToY(data.prices[x]));
        }
        polyLine.setAttribute('points', points.join(' '));
    }

    function removeStock(symbol) {
        if (stockData.symbols[symbol]) {
            delete stockData.symbols[symbol];
            localStorage.stockData = JSON.stringify(stockData);
        }
        const el = document.querySelector('.sym_' + symbol);
        if (el) {
            el.remove();
        }
    }

    const stockDataTemplate = `
        <a class="stockContainer" target="_blank">
            <div class="row" data-ui="graphRow">
                <div class="symbol" data-ui="symbol"></div>
                <div class="graph">
                    <svg preserveAspectRatio="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#fff" stroke-width="1" />
                        <polyline vector-effect="non-scaling-stroke" data-ui="graphPoints" points="" fill="none" stroke="#0c0" stroke-width="2" stroke-linejoin="round" />
                    </svg>
                </div>
                <div class="percent" data-ui="percent"></div>
            </div>
            <div class="row percentDiffRow" data-ui="percentDiffRow"></div>
            <div class="removeBtn" data-ui="removeBtn">X</div>
        </a>
    `;

    const stockData = JSON.parse(localStorage.stockData || '{"symbols":{}}');

    const stockDataContainer = document.querySelector('#stockData');

    function percentDiff(current, prev) {
        return (100 * (current / prev - 1));
    }

    function renderStock(symbol) {
        const symbolData = stockData.symbols[symbol];
        let el = document.querySelector('.sym_' + symbol);
        let ui;
        if (!el) {
            const template = instanceTemplate(stockDataTemplate);
            el = template.el;
            ui = template.ui;
            el.classList.add('sym_' + symbol);
            el.setAttribute('href', 'https://finance.yahoo.com/quote/' + symbol);
            ui.removeBtn.addEventListener('click', e => {
                e.preventDefault();
                removeStock(symbol);
            });
            stockDataContainer.appendChild(el);
        } else {
            ui = getUI(el);
        }
        ui.symbol.textContent = symbol;

        const graph = symbolData.graph;
        const percentChange = percentDiff(graph.prices[graph.prices.length - 1], graph.previousClose).toFixed(2);
        ui.percent.textContent = percentChange + '%';
        if (percentChange < 0) {
            ui.graphRow.classList.add('red');
        } else {
            ui.graphRow.classList.remove('red');
        }

        ui.percentDiffRow.innerHTML = '';
        const percentDiffs = symbolData.dayPercentDiffs || [];
        percentDiffs.forEach(d => {
            const div = document.createElement('div');
            let rating;
            if (d > 1.2) {
                rating = 'veryGood';
            } else if (d > 0.2) {
                rating = 'good';
            } else if (d > -0.2) {
                rating = 'flat';
            } else if (d > -1.2) {
                rating = 'bad';
            } else {
                rating = 'veryBad';
            }
            div.className = 'dayPercentDiff ' + rating;
            ui.percentDiffRow.appendChild(div);
        });

        drawGraph(ui.graphPoints, graph);
        return el;
    }

    const fixStockGraphData = (graph) => {
        const prices = graph.prices;
        let lastVisited = 0;
        const findNext = (pos) => {
            for (let x = pos - 1; x > -1; x--) {
                if (prices[x]) {
                    return prices[x];
                }
            }
            return 0;
        };
        for (let x = prices.length - 1; x > -1; x--) {
            if (!prices[x]) {
                prices[x] = findNext(x) || lastVisited;
                lastVisited = prices[x];
            }
        }
    };

    const fetchStockData = async (symbol) => {
        const date = new Date();
        const dow = date.getDay();
        const hour = date.getHours();
        const symbolData = stockData.symbols[symbol] || {lastFetch: 0};
        const duringTradingHours = dow > 0 && dow < 6 && hour > 5 && hour < 13;

        const stockDate = new Date();
        stockDate.setHours(stockDate.getHours() - 6);
        const symbolDate = new Date(symbolData.lastFetch);
        if (duringTradingHours ||
            stockDate.getDate() !== symbolDate.getDate() ||
            (symbolData.fetchedDuringTradingHours && !duringTradingHours)) {

            // monday through friday, 6am - 1pm PST.
            if (stockDate.getTime() - symbolData.lastFetch > 5 * 60 * 1000) {
                let data;
                try {
                    data = await getStockGraph(symbol);
                } catch (e) { console.error(e); }
                if (data.previousClose && data.prices.length) {
                    fixStockGraphData(data);
                    symbolData.graph = data;
                    symbolData.lastFetch = stockDate.getTime();
                    symbolData.fetchedDuringTradingHours = duringTradingHours;
                    stockData.symbols[symbol] = symbolData;
                    localStorage.stockData = JSON.stringify(stockData);
                }
            }
        }
        if (!symbolData.dayPercentDiffs || stockDate.getDate() !== symbolDate.getDate()) {
            let data;
            try {
                data = await getHistoricClosePrices(symbol, 16);
            } catch (e) { console.error(e); }
            if (data) {
                const dayPercentDiffs = [];
                for (let x = 0; x < data.length - 1; x++) {
                    dayPercentDiffs.push(percentDiff(data[x + 1], data[x]));
                }
                while (dayPercentDiffs.length > 10) {
                    dayPercentDiffs.shift();
                }
                symbolData.dayPercentDiffs = dayPercentDiffs;
                stockData.symbols[symbol] = symbolData;
                localStorage.stockData = JSON.stringify(stockData);
            }
        }
    };

    const tickerTextbox = document.querySelector('#addTickerTextbox');
    tickerTextbox.addEventListener('keydown', async e => {
        if (e.keyCode === 13) { // enter
            const symbol = tickerTextbox.value.toUpperCase();
            tickerTextbox.value = '';
            if (symbol) {
                await fetchStockData(symbol);
                renderStock(symbol);
            }
        }
    });

    Object.keys(stockData.symbols).forEach(async (symbol) => {
        renderStock(symbol);
        await fetchStockData(symbol);
        renderStock(symbol); // rerender with updated data.
    });
}
