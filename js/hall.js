document.addEventListener('DOMContentLoaded', function() {
    console.log('=== HALL PAGE DEBUG INFO ===');
    
    const params = new URLSearchParams(window.location.search);
    const filmId = params.get('film');
    const hallId = params.get('hall');
    const time = params.get('time');
    const dateStr = params.get('date');

    
    if (!filmId || !hallId || !time) {
        console.error('Missing required parameters');
        alert('Ошибка: не указаны параметры сеанса');
        window.location.href = 'index.html';
        return;
    }
    
    const localHalls = JSON.parse(localStorage.getItem('halls')) || [];
    const localMovies = JSON.parse(localStorage.getItem('movies')) || [];
    
    const movie = localMovies.find(m => {
        return m.id === filmId || 
               m.id.toString() === filmId.toString() ||
               `movie_${m.id}` === filmId ||
               m.id === `movie_${filmId}`;
    });
    
    const hall = localHalls.find(h => {
        return h.id === hallId || 
               h.id.toString() === hallId.toString() ||
               `hall_${h.id}` === hallId ||
               h.id === `hall_${hallId}` ||
               h.name === hallId;
    });
    
    if (!movie) {
        console.error('Movie not found. All movies:', localMovies);
        alert('Фильм не найден в базе данных');
        return;
    }
    
    if (!hall) {
        console.error('Hall not found. All halls:', localHalls);
        alert('Зал не найден в базе данных');
        return;
    }
    
    const prices = hall.prices || { normal: 250, vip: 350 };
    
    const sessionData = {
        filmId: filmId,
        hallId: hallId,
        time: time,
        date: dateStr || getTodayDate(),
        movieTitle: movie.title || movie.name,
        hallName: hall.name || `Зал ${hall.id}`,
        hallRows: hall.rows || 5,
        hallSeats: hall.seats || 6,
        hallLayout: hall.layout || [],
        prices: prices 
    };
    
    const date = new Date(parseInt(sessionData.time) * 1000);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    
    document.getElementById('movie-title').textContent = sessionData.movieTitle;
    document.getElementById('session-info').textContent = `Начало сеанса: ${formattedTime}`;
    document.getElementById('hall-name').textContent = sessionData.hallName;
    
    updateLegendPrices(sessionData.prices);
    
    function updateLegendPrices(prices) {
        console.log('Updating legend with prices:', prices);
        
        const freeLegend = document.getElementById('legend-free');
        if (freeLegend) {
            freeLegend.innerHTML = `<span class="seat free"></span> Свободно (${prices.normal}₽)`;
            console.log('Updated free legend:', prices.normal + '₽');
        }
        const vipLegend = document.getElementById('legend-vip');
        if (vipLegend) {
            vipLegend.innerHTML = `<span class="seat vip"></span> VIP (${prices.vip}₽)`;
            console.log('Updated VIP legend:', prices.vip + '₽');
        }
    }

    const hallScheme = document.getElementById('hall-scheme');

    hallScheme.innerHTML = '';

    hallScheme.style.display = 'grid';
    hallScheme.style.gridTemplateColumns = `repeat(${sessionData.hallSeats}, 24px)`;
    hallScheme.style.gap = '4px';
    hallScheme.style.justifyContent = 'center';
    hallScheme.style.margin = '20px auto';

    let selectedSeats = [];
    let totalPrice = 0;

    const rows = sessionData.hallRows;
    const seats = sessionData.hallSeats;
    const layout = sessionData.hallLayout.length > 0 
        ? sessionData.hallLayout 
        : Array(rows * seats).fill('normal');
    
    console.log('Rendering hall:', { 
        rows, 
        seats, 
        layoutLength: layout.length,
        normalPrice: sessionData.prices.normal,
        vipPrice: sessionData.prices.vip
    });

    for (let row = 0; row < rows; row++) {
        for (let seatNum = 0; seatNum < seats; seatNum++) {
            const index = row * seats + seatNum;
            let seatType = 'normal';
            
            if (layout && layout[index]) {
                seatType = layout[index];
            }
            
            const seat = document.createElement('div');
            seat.classList.add('seat');
            seat.dataset.row = row + 1;
            seat.dataset.seat = seatNum + 1;
            seat.dataset.index = index;

            let seatPrice;
            let seatClass;
            
            if (seatType === 'vip') {
                seatClass = 'vip';
                seatPrice = sessionData.prices.vip;
                seat.title = `Ряд ${row + 1}, Место ${seatNum + 1} (VIP ${seatPrice}₽)`;
            } else if (seatType === 'disabled') {
                seatClass = 'busy';
                seat.title = 'Место недоступно';
                seatPrice = 0;
            } else {
                seatClass = 'free';
                seatPrice = sessionData.prices.normal;
                seat.title = `Ряд ${row + 1}, Место ${seatNum + 1} (${seatPrice}₽)`;
            }
            
            seat.classList.add(seatClass);
            seat.dataset.price = seatPrice;
            seat.dataset.type = seatType;
            
            if (seatType !== 'disabled') {
                seat.addEventListener('click', () => {
                    const seatId = `${seat.dataset.row}-${seat.dataset.seat}`;
                    const price = parseInt(seat.dataset.price);
                    
                    if (seat.classList.contains('selected')) {
                        seat.classList.remove('selected');
                        selectedSeats = selectedSeats.filter(s => s.id !== seatId);
                        totalPrice -= price;
                    } else {
                        seat.classList.add('selected');
                        selectedSeats.push({
                            id: seatId,
                            row: seat.dataset.row,
                            seat: seat.dataset.seat,
                            price: price,
                            type: seat.classList.contains('vip') ? 'VIP' : 'Standard',
                            index: seat.dataset.index
                        });
                        totalPrice += price;
                    }
                    updateBookButton();
                });
            }
            
            hallScheme.appendChild(seat);
        }
    }

    function updateBookButton() {
        const bookBtn = document.querySelector('.book-btn');
        if (selectedSeats.length > 0) {
            bookBtn.textContent = `ЗАБРОНИРОВАТЬ (${selectedSeats.length} мест, ${totalPrice}₽)`;
            bookBtn.disabled = false;
        } else {
            bookBtn.textContent = 'ЗАБРОНИРОВАТЬ';
            bookBtn.disabled = true;
        }
    }
    document.querySelector('.book-btn').addEventListener('click', function() {
        if (selectedSeats.length === 0) {
            alert('Выберите хотя бы одно место');
            return;
        }

        const bookingCode = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
        const bookingData = {
            bookingCode: bookingCode,
            filmId: sessionData.filmId,
            movieTitle: sessionData.movieTitle,
            hallId: sessionData.hallId,
            hallName: sessionData.hallName,
            date: sessionData.date,
            time: formattedTime,
            selectedSeats: selectedSeats.map(s => ({
                row: s.row,
                seat: s.seat,
                type: s.type,
                price: s.price
            })),
            totalPrice: totalPrice,
            bookingTime: new Date().toISOString(),
            hallRows: sessionData.hallRows,
            hallSeats: sessionData.hallSeats,
            hallLayout: sessionData.hallLayout,
            prices: sessionData.prices
        };

        localStorage.setItem(`booking_${bookingCode}`, JSON.stringify(bookingData));
        localStorage.setItem('lastBookingCode', bookingCode);
        
    
        window.location.href = `ticket.html?code=${bookingCode}`;
    });

    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    updateBookButton();
});