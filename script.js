document.addEventListener('DOMContentLoaded', function() {
    const calendarDiv = document.getElementById('calendar');
    const monthLabel = document.getElementById('monthLabel');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const useLocationCheckbox = document.getElementById('useLocation');
    const adjustByMoonCheckbox = document.getElementById('adjustByMoon');
    const infoDiv = document.getElementById('info');

    let today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();
    let locationEnabled = false;
    let lat = null, lon = null;

    function updateInfo(msg) {
        infoDiv.textContent = msg;
    }

    // Request geolocation when user enables it
    useLocationCheckbox.addEventListener('change', () => {
        if (useLocationCheckbox.checked) {
            if (!navigator.geolocation) {
                updateInfo('Geolocation not available in this browser.');
                useLocationCheckbox.checked = false;
                return;
            }
            updateInfo('Requesting location...');
            navigator.geolocation.getCurrentPosition((pos) => {
                lat = pos.coords.latitude;
                lon = pos.coords.longitude;
                locationEnabled = true;
                updateInfo(`Location set: ${lat.toFixed(4)}, ${lon.toFixed(4)}.`);
                render();
            }, (err) => {
                updateInfo('Location permission denied or unavailable.');
                useLocationCheckbox.checked = false;
                locationEnabled = false;
            });
        } else {
            locationEnabled = false;
            updateInfo('Location disabled.');
            render();
        }
    });

    adjustByMoonCheckbox.addEventListener('change', () => render());

    prevBtn.addEventListener('click', () => { viewMonth--; if (viewMonth<0){viewMonth=11; viewYear--;} render(); });
    nextBtn.addEventListener('click', () => { viewMonth++; if (viewMonth>11){viewMonth=0; viewYear++;} render(); });

    render();

    function render() {
        monthLabel.textContent = `${new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {month: 'long', year: 'numeric'})}`;
        buildCalendar(viewYear, viewMonth);
    }
});

// ---------- Utility & Conversion Functions ----------

function toJulianDay(date) {
    // date is a JS Date
    const year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1;
    let day = date.getUTCDate() + date.getUTCHours()/24 + date.getUTCMinutes()/1440 + date.getUTCSeconds()/86400;
    let Y = year;
    let M = month;
    if (M <= 2) { Y = Y - 1; M = M + 12; }
    const A = Math.floor(Y/100);
    const B = 2 - A + Math.floor(A/4);
    const jd = Math.floor(365.25*(Y+4716)) + Math.floor(30.6001*(M+1)) + day + B - 1524.5;
    return jd;
}

function gregorianToHijri(gDate) {
    // Implementation of an arithmetic Islamic conversion (widely used algorithm)
    // returns {year, month, day}
    const jd = Math.floor(toJulianDay(gDate)) + 0; // integer JD
    let l = jd - 1948440 + 10632;
    let n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    let j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
    l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    let m = Math.floor((24 * l) / 709);
    let d = l - Math.floor((709 * m) / 24);
    let y = 30 * n + j - 30;
    return { year: y, month: m, day: d };
}

const hijriMonthNames = ['','Muharram','Safar','Rabiʻ I','Rabiʻ II','Jumada I','Jumada II','Rajab','Shaʻban','Ramadan','Shawwal','Dhuʻl-Qiʻdah','Dhuʻl-Hijjah'];

function getDaysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

function moonAge(jd) {
    // crude moon age based on mean synodic month relative to known new moon epoch
    const synodic = 29.530588853;
    const newMoonEpoch = 2451550.1; // known new moon epoch (2000 Jan 6)
    let age = (jd - newMoonEpoch) % synodic;
    if (age < 0) age += synodic;
    return age;
}

// ---------- Calendar Rendering ----------

function buildCalendar(year, monthIndex) {
    const calendarDiv = document.getElementById('calendar');
    const adjustByMoon = document.getElementById('adjustByMoon').checked;
    const useLocation = document.getElementById('useLocation').checked;
    const today = new Date();

    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let html = '';
    // Weekday headers
    html += '<div class="calendar-grid">';
    for (let wd of weekdays) { html += `<div class="weekday">${wd}</div>`; }

    const firstDay = new Date(year, monthIndex, 1).getDay();
    const days = getDaysInMonth(year, monthIndex);

    // blanks
    for (let i=0;i<firstDay;i++) html += `<div></div>`;

    for (let d=1; d<=days; d++) {
        const dateObj = new Date(year, monthIndex, d, 12, 0, 0); // midday local
        let hijri = gregorianToHijri(dateObj);

        // Optionally adjust by moon age at local sunset (very approximate)
        if (adjustByMoon) {
            // approximate local sunset time by 18:00 local time (simplified)
            const sunsetLocal = new Date(year, monthIndex, d, 18, 0, 0);
            const jdSunset = toJulianDay(new Date(sunsetLocal.getTime() - (sunsetLocal.getTimezoneOffset()*60000)));
            const age = moonAge(jdSunset);
            // If moon age at sunset is less than 1 day, treat this day as Hijri day 1 (approximate observational rule)
            if (age < 1.0) {
                // Override: set day to 1 (approx). Keep month/year from computed value.
                hijri.day = 1;
            }
        }

        const isToday = (dateObj.toDateString() === new Date().toDateString());
        html += `<div class="day-cell"${isToday ? ' style="outline: 2px solid #4a90e2"' : ''}>
                    <div class="day-greg">${d}</div>
                    <div class="day-hijri">${hijri.day} ${hijriMonthNames[hijri.month]} ${hijri.year}</div>
                </div>`;
    }

    html += '</div>';
    calendarDiv.innerHTML = html;

    const info = document.getElementById('info');
    if (adjustByMoon) {
        info.textContent = 'Moon-age adjustment enabled (approximate). Uses a simplified moon-age test at local sunset (approx 18:00). For strict observational accuracy use local sighting or official Umm al-Qura data.';
    } else {
        info.textContent = 'Showing arithmetic (tabular) Hijri dates. Enable "Adjust by moon" for a simple location-based approximation.';
    }
}
