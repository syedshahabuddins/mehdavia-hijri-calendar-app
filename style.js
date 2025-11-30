document.addEventListener('DOMContentLoaded', function() {
    const calendarDiv = document.getElementById('calendar');
    const today = new Date();
    const hijriDate = convertToHijri(today);

    calendarDiv.innerHTML = `
        <h2>${hijriDate.day} ${hijriDate.monthName} ${hijriDate.year}</h2>
    `;
});

function convertToHijri(gregorianDate) {
    // This is a placeholder function. You need to implement the actual conversion logic.
    // For now, it returns a dummy date.
    return {
        day: 1,
        monthName: 'Muharram',
        year: 1444
    };
}
