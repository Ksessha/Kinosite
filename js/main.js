document.addEventListener('DOMContentLoaded', async function() {

    function getLocalData() {
        const halls = JSON.parse(localStorage.getItem('halls')) || [];
        const movies = JSON.parse(localStorage.getItem('movies')) || [];
        
        const sessions = [];
        
        halls.forEach(hall => {
            if (hall.salesOpen !== false && hall.sessions && hall.sessions.length > 0) {
                hall.sessions.forEach(session => {
                    const movie = movies.find(m => m.title === session.title);
                    
                    if (movie) {
                        sessions.push({
                            id: session.movieId || movie.id,
                            film_id: movie.id,
                            film_name: movie.title,
                            hall_id: hall.id,
                            hall_name: hall.name,
                            date: getTodayDate(),
                            time: minutesToTime(session.startMinutes)
                        });
                    }
                });
            }
        });
        
        return {
            halls: halls.map(hall => ({
                id: hall.id,
                name: hall.name,
                rows: hall.rows,
                cols: hall.seats,
                price: hall.prices?.normal || 250,
                vip_price: hall.prices?.vip || 350
            })),
            films: movies.map(movie => ({
                id: movie.id,
                name: movie.title,
                description: movie.description,
                duration: movie.duration,
                country: movie.country,
                poster: movie.poster
            })),
            seances: sessions
        };
    }
    
    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function minutesToTime(minutes) {
        if (!minutes) return '10:00';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    
    const scheduleContainer = document.getElementById('schedule');
    const daysRow = document.querySelector('.days-row');
    const movieTemplate = document.getElementById('movie-template');
    const hallScheduleTemplate = document.getElementById('hall-schedule-template');
    const timeSlotTemplate = document.getElementById('time-slot-template');

    function generateWeekDays() {
        if (!daysRow) return;
    
        daysRow.innerHTML = '';
    
        const weekDays = getWeekDays();
    
        weekDays.forEach((day, index) => {
            if (index < 6) {
                const dayElement = document.createElement('div');
                dayElement.className = 'day-item';
    
                const date = new Date(day.date);
                if (date.getDay() === 0 || date.getDay() === 6) {
                    dayElement.classList.add('weekend');
                }
    
                if (day.isToday) {
                    dayElement.classList.add('active', 'today');
                    dayElement.innerHTML = `
                        <div class="day-label">Сегодня</div>
                        <div class="day-line">
                            <span class="day-name">${day.dayName},</span>
                            <span class="day-date">${day.dayNumber}</span>
                        </div>
                    `;
                } else {
                    dayElement.innerHTML = `
                        <div class="day-name">${day.dayName},</div>
                        <div class="day-date">${day.dayNumber}</div>
                    `;
                }
    
                dayElement.dataset.date = day.date;
    
                dayElement.addEventListener('click', () => {
                    document.querySelectorAll('.day-item').forEach(d => d.classList.remove('active'));
                    dayElement.classList.add('active'); // выбранный день
                    loadSchedule(day.date);
                });                
    
                daysRow.appendChild(dayElement);
            }
        });
    
        // 7-й день — стрелка для переключения на другие дни
        const arrowElement = document.createElement('div');
        arrowElement.className = 'day-item arrow';
        arrowElement.innerHTML = `
            <svg width="14" height="18" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.81641 0L9.71484 6.64453L1.81641 13.3008L0 11.4492L5.80078 6.66797L0 1.85156L1.81641 0Z" fill="black"/>
            </svg>
        `;
        arrowElement.addEventListener('click', () => {
            alert('Сейчас доступны сеансы только на ближайшую неделю');
        });
    
        daysRow.appendChild(arrowElement);
    }    

    function getWeekDays(startDate = new Date()) {
        const days = [];
        const start = new Date(startDate);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            
            days.push({
                date: formatDate(date),
                dayName: getDayName(date),
                dayNumber: date.getDate(),
                isToday: i === 0
            });
        }
        
        return days;
    }
    
    function formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function getDayName(date) {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return days[date.getDay()];
    }

    async function loadSchedule(date = null) {
        if (!scheduleContainer) return;
        
        scheduleContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <p class="mt-3">Загрузка расписания...</p>
            </div>
        `;

        try {
            const targetDate = date || getTodayDate();
            const allData = getLocalData();
            const movies = allData.films || [];
            const halls = allData.halls || [];
            const allSessions = allData.seances || [];
            
            const todaysSessions = allSessions.filter(session => {
                return session.date === targetDate;
            });

            const moviesWithSessions = movies.map(movie => {
                const movieSessions = todaysSessions.filter(s => s.film_id === movie.id);
                return { ...movie, sessions: movieSessions };
            }).filter(movie => movie.sessions.length > 0);

            scheduleContainer.innerHTML = '';

            if (moviesWithSessions.length > 0) {
                moviesWithSessions.forEach(movie => {
                    const movieElement = createMovieElement(movie, halls, todaysSessions, targetDate);
                    scheduleContainer.appendChild(movieElement);
                });
            } else {
                scheduleContainer.innerHTML = `
                    <div class="alert alert-info">
                        На ${targetDate} сеансов нет.
                    </div>
                `;
            }

        } catch (err) {
            console.error('Ошибка загрузки расписания:', err);

            scheduleContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Ошибка загрузки расписания</h4>
                    <p>${err.message || 'Попробуйте обновить страницу или обратитесь в администрацию кинотеатра.'}</p>
                </div>
            `;
        }
    }

    function createMovieElement(movie, halls, todaysSessions, selectedDate) {
        if (!movieTemplate) return document.createElement('div');
        
        const template = movieTemplate.content.cloneNode(true);
        const movieCard = template.querySelector('.movie-card');
    
        if (!movieCard) return document.createElement('div');
    
        const leftBlock = movieCard.querySelector('.left-block');
        const poster = leftBlock?.querySelector('.movie-poster');
        const hallsContainer = leftBlock?.querySelector('.halls-container');
    
        if (poster) {
            const posterUrl = movie.poster || 'images/posters/default.jpg';
            poster.src = posterUrl;
            poster.alt = movie.name;
            poster.onerror = function() {
                this.src = 'images/posters/default.jpg';
            };
        }

        const rightBlock = movieCard.querySelector('.right-block');
        if (rightBlock) {
            rightBlock.querySelector('.movie-title').textContent = movie.name;
            rightBlock.querySelector('.movie-description').textContent = movie.description || 'Описание отсутствует';
            rightBlock.querySelector('.duration').textContent = `${movie.duration} минут `;
            rightBlock.querySelector('.country').textContent = movie.country || 'Не указано';
        }

        if (hallsContainer) {
            const sessionsByHall = {};
            movie.sessions.forEach(s => {
                if (!sessionsByHall[s.hall_id]) sessionsByHall[s.hall_id] = [];
                sessionsByHall[s.hall_id].push(s);
            });

            Object.keys(sessionsByHall).forEach(hallId => {
                const hall = halls.find(h => h.id === hallId);
                if (hall) {
                    const hallEl = createHallScheduleElement(hall, sessionsByHall[hallId], selectedDate);
                    hallsContainer.appendChild(hallEl);
                }
            });
        }

        return movieCard;
    }

    function createHallScheduleElement(hall, sessions, selectedDate) {
        if (!hallScheduleTemplate) return document.createElement('div');
        
        const template = hallScheduleTemplate.content.cloneNode(true);
        const hallEl = template.querySelector('.hall-schedule');
        
        if (!hallEl) return document.createElement('div');

        hallEl.querySelector('.hall-title').textContent = hall.name || `Зал ${hall.id}`;
        const timesContainer = hallEl.querySelector('.hall-times');

        sessions.sort((a, b) => {
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
            return timeA.localeCompare(timeB);
        });

        sessions.forEach(session => {
            const timeSlotClone = timeSlotTemplate.content.cloneNode(true);
            const timeSlot = timeSlotClone.querySelector('.time-slot');
            const timeText = timeSlotClone.querySelector('.time-text');
            
            if (timeSlot && timeText) {
                const sessionTime = session.time || '00:00';
                timeText.textContent = sessionTime;
                
                const sessionDateTime = new Date(`${selectedDate}T${sessionTime}`);
                const now = new Date();
                
                if (sessionDateTime < now) {
                    timeSlot.classList.add('disabled');
                    timeSlot.title = 'Сеанс уже прошёл';
                    timeSlot.disabled = true;
                } else {
                    timeSlot.addEventListener('click', async function(e) {
                        e.preventDefault();
                        
                        try {
                            // Получаем данные из localStorage
                            const localHalls = JSON.parse(localStorage.getItem('halls')) || [];
                            const localMovies = JSON.parse(localStorage.getItem('movies')) || [];
                            
                            // Находим фильм по названию из сеанса
                            const movie = localMovies.find(m => 
                                m.title === session.film_name || 
                                m.name === session.film_name ||
                                m.id === session.film_id
                            );
                            
                            if (!movie) {
                                alert('Фильм не найден');
                                return;
                            }
                            
                            // Находим зал по ID из сеанса
                            const hall = localHalls.find(h => 
                                h.id === session.hall_id || 
                                h.name === session.hall_name ||
                                h.id.toString() === session.hall_id.toString()
                            );
                            
                            if (!hall) {
                                alert('Зал не найден');
                                return;
                            }
                            
                            // Создаем timestamp для времени сеанса
                            const sessionDateTime = new Date(`${selectedDate}T${session.time}`);
                            const timestamp = Math.floor(sessionDateTime.getTime() / 1000);
                            
                            // Формируем URL в правильном формате
                            const url = `hall.html?film=${encodeURIComponent(movie.id)}&hall=${encodeURIComponent(hall.id)}&time=${timestamp}&date=${encodeURIComponent(selectedDate)}`;
                            
                            console.log('Redirecting to:', url);
                            window.location.href = url;
                            
                        } catch (error) {
                            console.error('Ошибка при переходе к выбору мест:', error);
                            alert('Не удалось загрузить информацию о сеансе. Пожалуйста, попробуйте позже.');
                        }
                    });
                }
                
                timesContainer.appendChild(timeSlotClone);
            }
        });

        return hallEl;
    }

    async function init() {
        try {
            generateWeekDays();
            await loadSchedule();
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            if (scheduleContainer) {
                scheduleContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <h4>Ошибка подключения к серверу</h4>
                        <p>Пожалуйста, проверьте подключение к интернету и обновите страницу.</p>
                    </div>
                `;
            }
        }
    }

    init();
    
    setInterval(async () => {
        const activeDate = document.querySelector('.day-item.active')?.dataset.date;
        if (activeDate) {
            await loadSchedule(activeDate);
        }
    }, 5 * 60 * 1000);
});