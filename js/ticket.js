document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingCode = urlParams.get('code');

    const ticketContent = document.getElementById('ticket-content');

    if (!bookingCode) {
        ticketContent.innerHTML = renderError('Не указан код бронирования.');
        return;
    }

    const bookingDataRaw = localStorage.getItem(`booking_${bookingCode}`);
    if (!bookingDataRaw) {
        ticketContent.innerHTML = renderError(`Билет с кодом ${bookingCode} не найден.`);
        return;
    }

    let bookingData;
    try {
        bookingData = JSON.parse(bookingDataRaw);
    } catch (e) {
        console.error(e);
        ticketContent.innerHTML = renderError('Ошибка чтения данных билета.');
        return;
    }

    if (!Array.isArray(bookingData.selectedSeats)) {
        bookingData.selectedSeats = [];
    }

    renderTicket(bookingData, bookingCode);
});

function renderError(message) {
    return `
        <div class="alert alert-danger text-center">
            <h4>Ошибка!</h4>
            <p>${message}</p>
            <a href="index.html" class="btn btn-primary mt-2">Вернуться к расписанию</a>
        </div>
    `;
}

function renderTicket(bookingData) {
    const ticketContent = document.getElementById('ticket-content');

    const formattedSeats = bookingData.selectedSeats.map(seat => {
        return `Ряд ${seat.row}, Место ${seat.seat}`;
    }).join('; ');

    const sessionStart = `${bookingData.time || ''}`;

    ticketContent.innerHTML = `
        <div class="ticket-details">
            <div class="mb-3">На фильм: <strong>${bookingData.movieTitle || 'Неизвестно'}</strong></div>
            <div class="mb-3">Места: <strong>${formattedSeats}</strong></div>
            <div class="mb-3">В зале: <strong>${bookingData.hallName || bookingData.hallId || '1'}</strong></div>
            <div class="mb-3">Начало сеанса: <strong>${sessionStart}</strong></div>
            <div class="mb-3">Стоимость: <strong>${bookingData.totalPrice || 0} рублей</strong></div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const code = new URLSearchParams(window.location.search).get('code');

    const btn = document.getElementById('get-code-btn');
    if (!btn || !code) return;

    btn.addEventListener('click', () => {
        window.location.href = `QR_code.html?code=${code}`;
    });
});
