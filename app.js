(function () {
  const KEY = "track.habits.v1";
  const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  const MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  const MONTH_TITLES = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];

  const app = document.getElementById("app");
  let view = "today";
  let selected = strip(new Date());
  let calCursor = new Date(selected.getFullYear(), selected.getMonth(), 1);

  function strip(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function keyOf(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function dayData(date) {
    const all = load();
    const k = keyOf(date);
    return all[k] || {};
  }

  function setTask(date, id, done) {
    const all = load();
    const k = keyOf(date);
    const row = all[k] || {};
    if (done) row[id] = true;
    else delete row[id];
    if (Object.keys(row).length) all[k] = row;
    else delete all[k];
    save(all);
  }

  function isWeekend(date) {
    const d = date.getDay();
    return d === 0 || d === 6;
  }

  function isFriday(date) {
    return date.getDay() === 5;
  }

  function tasksFor(date) {
    const food = [
      { id: "food.breakfast", group: "food", time: "08:00", label: "Завтрак", sub: "Съел осознанно" },
      { id: "food.lunch", group: "food", time: "13:00", label: "Обед", sub: "Без срывов" },
      { id: "food.dinner", group: "food", time: "19:00", label: "Ужин", sub: "Лёгкий финиш дня" },
    ];

    const job = [];
    if (isWeekend(date)) {
      job.push(
        { id: "job.questions", group: "job", time: "15:00", label: "Вопросы", sub: "2 часа · собесы" },
        { id: "job.livecoding", group: "job", time: "17:00", label: "Лайфкодинг", sub: "2 часа · руками" },
      );
    } else if (isFriday(date)) {
      job.push({
        id: "job.search",
        group: "job",
        time: "15:00",
        label: "Поиск работы",
        sub: "15:00–17:00 · отклики и сеть",
      });
    } else {
      job.push(
        { id: "job.questions", group: "job", time: "15:00", label: "Вопросы", sub: "1 час · теория" },
        { id: "job.livecoding", group: "job", time: "16:00", label: "Лайфкодинг", sub: "1 час · практика" },
      );
    }

    const mode = [
      { id: "mode.exercise", group: "mode", time: "07:00", label: "Зарядка", sub: "Тело включено" },
      { id: "mode.sleep", group: "mode", time: "22:00", label: "В кровать", sub: "До 22:00" },
    ];

    return food.concat(job, mode).sort((a, b) => a.time.localeCompare(b.time));
  }

  function progress(date) {
    const tasks = tasksFor(date);
    const doneMap = dayData(date);
    const groups = { food: { total: 0, done: 0 }, job: { total: 0, done: 0 }, mode: { total: 0, done: 0 } };
    let done = 0;
    tasks.forEach((t) => {
      groups[t.group].total += 1;
      if (doneMap[t.id]) {
        done += 1;
        groups[t.group].done += 1;
      }
    });
    return {
      total: tasks.length,
      done,
      pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      groups,
      complete: done === tasks.length && tasks.length > 0,
    };
  }

  function formatDayTitle(date) {
    const today = strip(new Date());
    const diff = Math.round((strip(date) - today) / 86400000);
    const base = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    if (diff === 0) return `Сегодня · ${base}`;
    if (diff === -1) return `Вчера · ${base}`;
    if (diff === 1) return `Завтра · ${base}`;
    return base;
  }

  function weekdayLabel(date) {
    const i = (date.getDay() + 6) % 7;
    return WEEKDAYS[i];
  }

  function shiftDate(date, delta) {
    const n = new Date(date);
    n.setDate(n.getDate() + delta);
    return strip(n);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function navHtml() {
    return (
      '<nav class="nav">' +
        `<button type="button" data-view="today" class="${view === "today" ? "on" : ""}">Сегодня</button>` +
        `<button type="button" data-view="calendar" class="${view === "calendar" ? "on" : ""}">Календарь</button>` +
        `<button type="button" data-view="stats" class="${view === "stats" ? "on" : ""}">Статистика</button>` +
      "</nav>"
    );
  }

  function taskButton(task, done) {
    return (
      `<button type="button" class="task ${done ? "done" : ""}" data-task="${esc(task.id)}">` +
        `<span class="time">${esc(task.time)}</span>` +
        `<span><span class="label">${esc(task.label)}</span>` +
        `<span class="sub">${esc(task.sub)}</span></span>` +
        `<span class="check" aria-hidden="true">✓</span>` +
      "</button>"
    );
  }

  function renderToday() {
    const p = progress(selected);
    const doneMap = dayData(selected);
    const tasks = tasksFor(selected);
    const food = tasks.filter((t) => t.group === "food");
    const job = tasks.filter((t) => t.group === "job");
    const mode = tasks.filter((t) => t.group === "mode");
    const isToday = keyOf(selected) === keyOf(new Date());

    const jobWhy = isWeekend(selected)
      ? "Выходные: 4 часа — вопросы + лайфкодинг. Это инвестиция в оффер."
      : isFriday(selected)
        ? "Пятница: только поиск работы 15:00–17:00. Двигаешь воронку."
        : "Будни: вопросы в 15:00, лайфкод в 16:00. Каждый день ближе к 350 000 ₽.";

    return (
      '<header class="top">' +
        '<div class="brand">' +
          "<h1>Track</h1>" +
          `<p>${esc(formatDayTitle(selected))} · ${esc(weekdayLabel(selected))}</p>` +
        "</div>" +
        '<div class="date-nav">' +
          '<button type="button" data-shift="-1" aria-label="Предыдущий день">‹</button>' +
          (isToday ? "" : '<button type="button" class="today-btn" data-goto-today>сегодня</button>') +
          '<button type="button" data-shift="1" aria-label="Следующий день">›</button>' +
        "</div>" +
      "</header>" +

      '<section class="progress-card">' +
        `<div class="ring" style="--p:${p.pct}"><span>${p.pct}%</span></div>` +
        '<div class="progress-meta">' +
          `<strong>${p.done} из ${p.total} пунктов</strong>` +
          `<p>${p.complete ? "День закрыт. Так держать." : "Отмечай по мере выполнения — день сам сложится."}</p>` +
          '<div class="chips">' +
            `<span class="chip food">еда ${p.groups.food.done}/${p.groups.food.total}</span>` +
            `<span class="chip job">работа ${p.groups.job.done}/${p.groups.job.total}</span>` +
            `<span class="chip mode">режим ${p.groups.mode.done}/${p.groups.mode.total}</span>` +
          "</div>" +
        "</div>" +
      "</section>" +

      '<section class="section">' +
        '<div class="section-head"><h2>Еда</h2><span class="tag">здоровье</span></div>' +
        '<div class="motivate">' +
          '<img src="assets/arni.jpg" width="64" height="64" alt="Арнольд Шварценеггер">' +
          "<div>" +
            "<p>Ты это делаешь, чтобы похудеть и вернуть здоровье — не «на сегодня», а на годы вперёд.</p>" +
            '<p class="why">Три приёма пищи. Три галочки. Дисциплина как у чемпиона.</p>' +
          "</div>" +
        "</div>" +
        food.map((t) => taskButton(t, !!doneMap[t.id])).join("") +
      "</section>" +

      '<section class="section">' +
        '<div class="section-head"><h2>Работа · 350 000 ₽</h2><span class="tag">карьера</span></div>' +
        '<div class="motivate job-mot">' +
          "<div>" +
            "<p>Цель — новая работа с доходом 350 000 ₽. Каждая сессия = шаг к офферу.</p>" +
            `<p class="why">${esc(jobWhy)}</p>` +
          "</div>" +
        "</div>" +
        job.map((t) => taskButton(t, !!doneMap[t.id])).join("") +
      "</section>" +

      '<section class="section">' +
        '<div class="section-head"><h2>Режим</h2><span class="tag">зарядка + сон</span></div>' +
        mode.map((t) => taskButton(t, !!doneMap[t.id])).join("") +
        '<p class="hint">Зарядка утром и отбой до 22:00 — один контур энергии. Без него еда и работа сыпятся.</p>' +
      "</section>" +
      navHtml()
    );
  }

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function renderCalendar() {
    const y = calCursor.getFullYear();
    const m = calCursor.getMonth();
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
    const total = daysInMonth(y, m);
    const todayKey = keyOf(new Date());
    const selectedKey = keyOf(selected);
    let cells = "";

    for (let i = 0; i < firstDow; i += 1) {
      cells += '<div class="day-cell empty"></div>';
    }

    for (let d = 1; d <= total; d += 1) {
      const date = new Date(y, m, d);
      const p = progress(date);
      const k = keyOf(date);
      const cls = [
        "day-cell",
        k === todayKey ? "today" : "",
        k === selectedKey ? "selected" : "",
        p.complete ? "complete" : "",
      ].filter(Boolean).join(" ");
      const g = p.groups;
      cells +=
        `<button type="button" class="${cls}" data-pick="${k}">` +
          `<span class="d">${d}</span>` +
          '<span class="dots">' +
            `<i class="${g.food.done === g.food.total && g.food.total ? "on food" : ""}"></i>` +
            `<i class="${g.job.done === g.job.total && g.job.total ? "on job" : ""}"></i>` +
            `<i class="${g.mode.done === g.mode.total && g.mode.total ? "on mode" : ""}"></i>` +
          "</span>" +
        "</button>";
    }

    return (
      '<header class="top">' +
        '<div class="brand"><h1>Календарь</h1><p>Точки — закрытые блоки дня</p></div>' +
      "</header>" +
      '<div class="cal-head">' +
        `<h2>${MONTH_TITLES[m]} ${y}</h2>` +
        '<div class="arrows">' +
          '<button type="button" data-cal-shift="-1" aria-label="Предыдущий месяц">‹</button>' +
          '<button type="button" data-cal-shift="1" aria-label="Следующий месяц">›</button>' +
        "</div>" +
      "</div>" +
      `<div class="weekdays">${WEEKDAYS.map((w) => `<span>${w}</span>`).join("")}</div>` +
      `<div class="cal-grid">${cells}</div>` +
      '<div class="legend">' +
        '<span class="food">еда</span>' +
        '<span class="job">работа</span>' +
        '<span class="mode">режим</span>' +
      "</div>" +
      '<p class="hint">Нажми день — откроется его трекер.</p>' +
      navHtml()
    );
  }

  function rangeStats(days) {
    const end = strip(new Date());
    let done = 0;
    let total = 0;
    const groups = {
      food: { done: 0, total: 0 },
      job: { done: 0, total: 0 },
      mode: { done: 0, total: 0 },
    };
    let perfect = 0;

    for (let i = 0; i < days; i += 1) {
      const d = shiftDate(end, -i);
      const p = progress(d);
      done += p.done;
      total += p.total;
      if (p.complete) perfect += 1;
      ["food", "job", "mode"].forEach((g) => {
        groups[g].done += p.groups[g].done;
        groups[g].total += p.groups[g].total;
      });
    }

    return { done, total, perfect, groups, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function streak() {
    let n = 0;
    let cursor = strip(new Date());
    const todayP = progress(cursor);
    if (!todayP.complete) cursor = shiftDate(cursor, -1);
    while (true) {
      const p = progress(cursor);
      if (!p.complete) break;
      n += 1;
      cursor = shiftDate(cursor, -1);
      if (n > 400) break;
    }
    return n;
  }

  function renderStats() {
    const week = rangeStats(7);
    const month = rangeStats(30);
    const s = streak();

    function bar(label, g, cls) {
      const pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
      return (
        '<div class="bar-row">' +
          `<div class="row"><span>${esc(label)}</span><span>${pct}%</span></div>` +
          `<div class="track ${cls}"><i style="width:${pct}%"></i></div>` +
        "</div>"
      );
    }

    return (
      '<header class="top">' +
        '<div class="brand"><h1>Статистика</h1><p>Сводка за неделю и месяц</p></div>' +
      "</header>" +
      '<div class="stats-grid">' +
        `<div class="stat"><p class="n">${s}</p><p class="l">дней подряд полностью</p></div>` +
        `<div class="stat"><p class="n">${week.perfect}/7</p><p class="l">идеальных дней за неделю</p></div>` +
        `<div class="stat"><p class="n">${week.pct}%</p><p class="l">выполнение за 7 дней</p></div>` +
        `<div class="stat"><p class="n">${month.pct}%</p><p class="l">выполнение за 30 дней</p></div>` +
      "</div>" +
      '<section class="section">' +
        '<div class="section-head"><h2>За 7 дней</h2></div>' +
        '<div class="bar-list">' +
          bar("Еда", week.groups.food, "food") +
          bar("Работа", week.groups.job, "job") +
          bar("Режим", week.groups.mode, "mode") +
        "</div>" +
      "</section>" +
      '<section class="section">' +
        '<div class="section-head"><h2>За 30 дней</h2></div>' +
        '<div class="bar-list">' +
          bar("Еда", month.groups.food, "food") +
          bar("Работа", month.groups.job, "job") +
          bar("Режим", month.groups.mode, "mode") +
        "</div>" +
      "</section>" +
      navHtml()
    );
  }

  function render() {
    if (view === "calendar") app.innerHTML = renderCalendar();
    else if (view === "stats") app.innerHTML = renderStats();
    else app.innerHTML = renderToday();
  }

  app.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn) {
      view = viewBtn.getAttribute("data-view");
      render();
      return;
    }

    const shift = e.target.closest("[data-shift]");
    if (shift) {
      selected = shiftDate(selected, Number(shift.getAttribute("data-shift")));
      render();
      return;
    }

    if (e.target.closest("[data-goto-today]")) {
      selected = strip(new Date());
      render();
      return;
    }

    const calShift = e.target.closest("[data-cal-shift]");
    if (calShift) {
      calCursor = new Date(
        calCursor.getFullYear(),
        calCursor.getMonth() + Number(calShift.getAttribute("data-cal-shift")),
        1,
      );
      render();
      return;
    }

    const pick = e.target.closest("[data-pick]");
    if (pick) {
      const [yy, mm, dd] = pick.getAttribute("data-pick").split("-").map(Number);
      selected = new Date(yy, mm - 1, dd);
      view = "today";
      render();
      return;
    }

    const task = e.target.closest("[data-task]");
    if (task) {
      const id = task.getAttribute("data-task");
      const done = !dayData(selected)[id];
      setTask(selected, id, done);
      render();
    }
  });

  render();
})();
