document.addEventListener('DOMContentLoaded', () => {
    const ticketContent = document.getElementById('ticket-content');
    const code = new URLSearchParams(window.location.search).get('code');

    if (!code) {
        ticketContent.innerHTML = '<p>Код бронирования не найден</p>';
        return;
    }

    const bookingDataRaw = localStorage.getItem(`booking_${code}`);
    if (!bookingDataRaw) {
        ticketContent.innerHTML = '<p>Билет не найден</p>';
        return;
    }

    const bookingData = JSON.parse(bookingDataRaw);

    renderTicket(bookingData);

    const qrCanvas = document.createElement('canvas');
    qrCanvas.id = 'qr-canvas';
    ticketContent.appendChild(qrCanvas);

    QRCode.toCanvas(qrCanvas, code, {
        width: 220,
        margin: 1
    });
});

function renderTicket(bookingData) {
    const ticketContent = document.getElementById('ticket-content');

    const formattedSeats = bookingData.selectedSeats
        .map(seat => `Ряд ${seat.row}, Место ${seat.seat}`)
        .join(', ');

    ticketContent.innerHTML = `
        <div class="ticket-details">
            <div class="mb-3">
                На фильм: <strong>${bookingData.movieTitle || 'Неизвестно'}</strong>
            </div>
            <div class="mb-3">
                Места: <strong>${formattedSeats}</strong>
            </div>
            <div class="mb-3">
                В зале: <strong>${bookingData.hallName || bookingData.hallId}</strong>
            </div>
            <div class="mb-3">
                Начало сеанса: <strong>${bookingData.time}</strong>
            </div>
            <div class="mb-3">
                Стоимость: <strong>${bookingData.totalPrice} рублей</strong>
            </div>

            <div id="qr-code" class="mt-4 text-center"></div>
        </div>
    `;
    QRCode.toCanvas(
        document.createElement('canvas'),
        bookingData.bookingCode,
        { width: 200 },
        (err, canvas) => {
            if (!err) {
                document.getElementById('qr-code').appendChild(canvas);
            }
        }
    );
}

document.addEventListener('DOMContentLoaded', () => {
    const code = new URLSearchParams(window.location.search).get('code');

    if (!code) {
        alert('Код бронирования не найден');
        return;
    }

    const bookingData = localStorage.getItem(`booking_${code}`);

    if (!bookingData) {
        alert('Билет не найден');
        return;
    }

    renderTicket(JSON.parse(bookingData));
});

