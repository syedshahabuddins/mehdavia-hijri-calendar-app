// Global location variables (set when user allows geolocation)
let gLat = null, gLon = null;

document.addEventListener('DOMContentLoaded', function() {
    const calendarDiv = document.getElementById('calendar');
    const monthLabelGreg = document.getElementById('monthLabelGreg');
    const monthLabelHijri = document.getElementById('monthLabelHijri');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const useLocationCheckbox = document.getElementById('useLocation');
    const adjustByMoonCheckbox = document.getElementById('adjustByMoon');
    const infoDiv = document.getElementById('info');

    let today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();
    let locationEnabled = false;
    // lat/lon will be stored in globals gLat/gLon

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
                gLat = pos.coords.latitude;
                gLon = pos.coords.longitude;
                locationEnabled = true;
                updateInfo(`Location set: ${gLat.toFixed(4)}, ${gLon.toFixed(4)}.`);
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

    // Settings toggle for small screens
    const toggleSettingsBtn = document.getElementById('toggleSettings');
    const settingsDiv = document.getElementById('settings');
    if (toggleSettingsBtn && settingsDiv) {
        toggleSettingsBtn.addEventListener('click', () => {
            const expanded = toggleSettingsBtn.getAttribute('aria-expanded') === 'true';
            toggleSettingsBtn.setAttribute('aria-expanded', String(!expanded));
            const visible = !expanded;
            settingsDiv.style.display = visible ? 'flex' : 'none';
            settingsDiv.setAttribute('aria-hidden', String(!visible));
        });
        // keep settings hidden by default on small screens
        settingsDiv.style.display = window.innerWidth <= 700 ? 'none' : 'flex';
    }

    // Touch / swipe support for month navigation
    let touchStartX = null;
    let touchStartY = null;
    const touchThreshold = 40; // px
    calendarDiv.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
    }, {passive:true});
    calendarDiv.addEventListener('touchend', (e) => {
        if (touchStartX === null) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        // ignore mostly-vertical swipes
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > touchThreshold) {
            if (dx < 0) { // swipe left -> next
                nextBtn.click();
            } else { // swipe right -> prev
                prevBtn.click();
            }
        }
        touchStartX = null;
        touchStartY = null;
    }, {passive:true});

    // Keyboard left/right navigation when calendar focused
    calendarDiv.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); prevBtn.click(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn.click(); }
    });

    function render() {
        // Gregorian label (left)
        monthLabelGreg.textContent = `${new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {month: 'long', year: 'numeric'})}`;
        // Hijri label (right) - compute Hijri for the 1st of the viewed Gregorian month
        const repDate = new Date(viewYear, viewMonth, 1, 12, 0, 0);
        const hij = gregorianToHijri(repDate);
        monthLabelHijri.textContent = `${hijriMonthNames[hij.month]} ${hij.year}`;
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

// ---------- Sunset Calculation (NOAA algorithm, approximate) ----------

function deg2rad(d) { return d * Math.PI / 180; }
function rad2deg(r) { return r * 180 / Math.PI; }

function dayOfYear(date) {
    const start = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / 86400000) + 1;
}

function fixAngle(a) {
    a = a % 360;
    if (a < 0) a += 360;
    return a;
}

function calcSunsetUTC(date, lat, lon) {
    // Returns UTC time (in hours) of sunset for the given date and location
    // Based on NOAA algorithm: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
    const zenith = 90.833; // official
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    // Day of year
    const N = dayOfYear(date);
    const lngHour = lon / 15;
    // approximate time
    const t = N + ((18 - lngHour) / 24);
    // Sun's mean anomaly
    const M = (0.9856 * t) - 3.289;
    // Sun's true longitude
    let L = M + (1.916 * Math.sin(deg2rad(M))) + (0.020 * Math.sin(deg2rad(2*M))) + 282.634;
    L = fixAngle(L);
    // Right ascension
    let RA = rad2deg(Math.atan2(0.91764 * Math.sin(deg2rad(L)), Math.cos(deg2rad(L))));
    RA = fixAngle(RA);
    // RA needs to be in the same quadrant as L
    const Lquadrant  = Math.floor(L/90) * 90;
    const RAquadrant = Math.floor(RA/90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15; // convert to hours
    // Sun declination
    const sinDec = 0.39782 * Math.sin(deg2rad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    // Sun local hour angle
    const cosH = (Math.cos(deg2rad(zenith)) - (sinDec * Math.sin(deg2rad(lat)))) / (cosDec * Math.cos(deg2rad(lat)));
    if (cosH > 1) return null; // sun never sets
    if (cosH < -1) return null; // sun never rises
    let H = rad2deg(Math.acos(cosH)); // in degrees
    // for sunset
    H = H / 15; // in hours
    // local mean time of setting
    const T = H + RA - (0.06571 * t) - 6.622;
    // UT time
    let UT = T - lngHour;
    // normalize UT to 0-24
    UT = UT % 24;
    if (UT < 0) UT += 24;
    return UT; // hours in UTC
}

function calcSunsetDateUTC(date, lat, lon) {
    // date is JS Date (will use its UTC year/month/day)
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const utHours = calcSunsetUTC(date, lat, lon);
    if (utHours === null) return null;
    const hour = Math.floor(utHours);
    const minute = Math.floor((utHours - hour) * 60);
    const second = Math.floor(((utHours - hour)*60 - minute) * 60);
    return new Date(Date.UTC(year, month, day, hour, minute, second));
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

        // Optionally adjust by moon age at local sunset
        if (adjustByMoon) {
            let jdSunset = null;
            if (useLocation && gLat !== null && gLon !== null) {
                const dateForCalc = new Date(Date.UTC(year, monthIndex, d));
                const sunsetUTC = calcSunsetDateUTC(dateForCalc, gLat, gLon);
                if (sunsetUTC) {
                    jdSunset = toJulianDay(sunsetUTC);
                }
            }
            if (!jdSunset) {
                // fallback: use 18:00 local time converted to UTC
                const sunsetLocal = new Date(year, monthIndex, d, 18, 0, 0);
                jdSunset = toJulianDay(new Date(sunsetLocal.getTime() - (sunsetLocal.getTimezoneOffset()*60000)));
            }
            const age = moonAge(jdSunset);
            // If moon age at sunset is less than 1 day, treat this day as Hijri day 1 (approximate observational rule)
            if (age < 1.0) {
                hijri.day = 1;
            }
        }

        const isToday = (dateObj.toDateString() === new Date().toDateString());
        // Make day cells focusable for keyboard users and improved reading order on small screens
        html += `<div class="day-cell${isToday ? ' today' : ''}" tabindex="0" role="button" aria-label="${d} ${new Date(year, monthIndex, d).toLocaleString(undefined,{month:'long'})}, Hijri ${hijri.day} ${hijriMonthNames[hijri.month]} ${hijri.year}">
                    <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                        <div class="day-greg">${d}</div>
                        <div class="small-title" style="color:#999;font-size:0.86rem">${new Date(year, monthIndex, d).toLocaleString(undefined,{weekday:'short'})}</div>
                    </div>
                    <div class="day-hijri">${hijri.day} ${hijriMonthNames[hijri.month]}</div>
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
