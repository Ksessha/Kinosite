document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (isAdmin !== 'true') {
        window.location.href = 'authorization.html';
        return;
    }

    document.querySelectorAll('.section-header').forEach(header => {
        const toggleBtn = header.querySelector('.toggle-btn');
        const body = header.nextElementSibling;
    
        if (toggleBtn && body) {
            toggleBtn.addEventListener('click', () => {
                body.classList.toggle('collapsed');
    
                const img = toggleBtn.querySelector('img');
                img.style.transform = body.classList.contains('collapsed') ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        }
    });  


    const originalSaveHalls = saveHalls;
    saveHalls = function() {
        originalSaveHalls();
        if (window.dataSync) {
            window.dataSync.syncHalls().catch(console.error);
        }
    };
    
    const originalSaveMovies = saveMovies;
    saveMovies = function() {
        originalSaveMovies();
        if (window.dataSync) {
            window.dataSync.syncMovies().catch(console.error);
        }
    };

    const rowsInput = document.getElementById('rowsInput');
    const seatsInput = document.getElementById('seatsInput');
    const hallGrid = document.getElementById('hallGrid');
    const hallTabs = document.getElementById('hall-tabs');
    const priceHallTabs = document.getElementById('price-hall-tabs');
    const hallList = document.getElementById('hallList');
    const addMovieBtn = document.querySelector('.add-movie-btn');
    const salesHallTabs = document.getElementById('sales-hall-tabs');

    const movieModal = document.getElementById('movieModal');
    const closeMovieModalBtn = document.getElementById('closeMovieModal');
    const cancelAddMovieBtn = document.getElementById('cancelAddMovie');
    const confirmAddMovieBtn = document.getElementById('confirmAddMovie');

    let halls = JSON.parse(localStorage.getItem('halls')) || [];
    let movies = JSON.parse(localStorage.getItem('movies')) || [];
    let activeHallId = null;
    let activePriceHallId = null;


    init();

    function init() {
        renderHallTabs();
        renderPriceHallTabs();
        renderSalesHallTabs();
        renderHallList();
        renderMoviesList();
        renderSessionsGrid();
        setupMovieModal();
        setupSalesButton();
        setupSaveButton();
        setupCancelButton();
        
        if (halls.length > 0) {
            setActiveHall(halls[0].id);
            setActivePriceHall(halls[0].id);
        }
    }

    function setupSaveButton() {
        const saveBtn = document.querySelector('.save-btn');
        if (!saveBtn) return;
        
        saveBtn.addEventListener('click', () => {
            const hall = getActiveHall();
            if (!hall) {
                alert('Выберите зал для сохранения!');
                return;
            }
            
            const rows = parseInt(rowsInput.value);
            const seats = parseInt(seatsInput.value);
            
            if (isNaN(rows) || rows < 1 || isNaN(seats) || seats < 1) {
                alert('Введите корректные значения для рядов и мест!');
                return;
            }
            
            hall.rows = rows;
            hall.seats = seats;
            
            const newTotalSeats = rows * seats;
            if (hall.layout.length !== newTotalSeats) {
                const newLayout = [];
                const oldRows = Math.floor(hall.layout.length / hall.seats);
                
                for (let row = 0; row < rows; row++) {
                    for (let seat = 0; seat < seats; seat++) {
                        if (row < oldRows && seat < hall.seats && 
                            (row * hall.seats + seat) < hall.layout.length) {
                            newLayout.push(hall.layout[row * hall.seats + seat]);
                        } else {
                            newLayout.push('normal');
                        }
                    }
                }
                hall.layout = newLayout;
            }
            
            saveHalls();
            renderHall();
            
            alert(`Конфигурация зала "${hall.name || `ЗАЛ ${hall.id}`}" сохранена!`);
        });
    }

    function setupCancelButton() {
        const cancelBtn = document.querySelector('.secondary-btn');
        if (!cancelBtn) return;
        
        cancelBtn.addEventListener('click', () => {
            const hall = getActiveHall();
            if (!hall) return;
            
            rowsInput.value = hall.rows;
            seatsInput.value = hall.seats;
            renderHall();
            
            alert('Изменения отменены');
        });
    }

    function renderSalesHallTabs() {
        if (!salesHallTabs) return;
        
        salesHallTabs.innerHTML = '';
        
        halls.forEach(hall => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.textContent = hall.name || `ЗАЛ ${hall.id}`;
            btn.dataset.hallId = hall.id;
            
            if (activePriceHallId === hall.id) {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', () => {
                activePriceHallId = hall.id;
                
                updatePriceTabButtons(hall.id);
                updateSalesTabButtons(hall.id);
                
                updateSalesButtonState();
            });
            salesHallTabs.appendChild(btn);
        });
    }

    function updatePriceTabButtons(activeHallId) {
        document.querySelectorAll('#price-hall-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.hallId === activeHallId);
        });
    }

    function updateSalesTabButtons(activeHallId) {
        document.querySelectorAll('#sales-hall-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.hallId === activeHallId);
        });
    }

    function updateSalesTabButtons(activeHallId) {
        document.querySelectorAll('#sales-hall-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.hallId === activeHallId);
        });
    }

    function setupSalesButton() {
        const openSalesBtn = document.getElementById('open-sales-btn');
        if (!openSalesBtn) return;
        
        updateSalesButtonState();
        
        openSalesBtn.addEventListener('click', () => {
            if (!activePriceHallId) {
                alert('Выберите зал для настройки продаж');
                return;
            }
            
            const hall = halls.find(h => h.id === activePriceHallId);
            if (!hall) return;
            
            hall.salesOpen = !hall.salesOpen;
            saveHalls();
            
            if (window.dataSync) {
                window.dataSync.updateHallSales(hall).catch(error => {
                    console.error('Failed to sync sales status:', error);
                    hall.salesOpen = !hall.salesOpen;
                    saveHalls();
                    updateSalesButtonState();
                    alert('Ошибка синхронизации с сервером. Статус продаж не изменен.');
                    return;
                });
            }
            
            updateSalesButtonState();
            
            if (hall.salesOpen) {
                alert(`Продажи билетов для "${hall.name}" ОТКРЫТЫ! Данные синхронизированы с сервером.`);
            } else {
                alert(`Продажи билетов для "${hall.name}" ЗАКРЫТЫ! Данные синхронизированы с сервером.`);
            }
        });
    }
    
    function updateSalesButtonState() {
        const openSalesBtn = document.getElementById('open-sales-btn');
        if (!openSalesBtn) return;
        
        const hall = halls.find(h => h.id === activePriceHallId);
        if (!hall) {
            openSalesBtn.textContent = 'ОТКРЫТЬ ПРОДАЖУ БИЛЕТОВ';
            openSalesBtn.classList.remove('sales-open');
            return;
        }
        
        if (hall.salesOpen) {
            openSalesBtn.textContent = 'ПРОДАЖИ ОТКРЫТЫ (нажмите чтобы закрыть)';
            openSalesBtn.classList.add('sales-open');
        } else {
            openSalesBtn.textContent = 'ОТКРЫТЬ ПРОДАЖУ БИЛЕТОВ';
            openSalesBtn.classList.remove('sales-open');
        }
    }
    function setupMovieModal() {
    
        addMovieBtn.addEventListener('click', () => {
            console.log('Открытие модального окна добавления фильма');
            const movieTitle = document.getElementById('movieTitle');
            const movieDuration = document.getElementById('movieDuration');
            const movieDescription = document.getElementById('movieDescription');
            const movieCountry = document.getElementById('movieCountry');
            const moviePosterInput = document.getElementById('moviePoster');
            const addPosterBtn = document.getElementById('addPosterBtn');
            
            if (addPosterBtn && moviePosterInput) {
                const newAddPosterBtn = addPosterBtn.cloneNode(true);
                addPosterBtn.parentNode.replaceChild(newAddPosterBtn, addPosterBtn);
                
                const newMoviePosterInput = moviePosterInput.cloneNode(true);
                moviePosterInput.parentNode.replaceChild(newMoviePosterInput, moviePosterInput);
                
                newAddPosterBtn.addEventListener('click', () => {
                    newMoviePosterInput.click();
                });
            }
            
            if (movieTitle) movieTitle.value = '';
            if (movieDuration) movieDuration.value = '';
            if (movieDescription) movieDescription.value = '';
            if (movieCountry) movieCountry.value = '';
            if (moviePosterInput) moviePosterInput.value = '';
            
            movieModal.classList.remove('hidden');
        });
        
        document.addEventListener('change', (e) => {
            if (e.target.id === 'moviePoster') {
                const file = e.target.files[0];
                if (file) {
                    if (!file.type.match('image.*')) {
                        alert('Пожалуйста, выберите изображение!');
                        return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        alert('Размер файла не должен превышать 5MB!');
                        return;
                    }
                    console.log('Постер выбран:', file.name);
                }
            }
        });
        
        function closeMovieModal() {
            movieModal.classList.add('hidden');
        }
        
        if (closeMovieModalBtn) {
            closeMovieModalBtn.addEventListener('click', closeMovieModal);
        }
        
        if (cancelAddMovieBtn) {
            cancelAddMovieBtn.addEventListener('click', closeMovieModal);
        }
        
        movieModal.addEventListener('click', (e) => {
            if (e.target === movieModal) {
                closeMovieModal();
            }
        });
        
        if (confirmAddMovieBtn) {
            confirmAddMovieBtn.addEventListener('click', () => {
                console.log('Нажата кнопка "Добавить фильм" в модалке');
                
                const movieTitle = document.getElementById('movieTitle');
                const movieDuration = document.getElementById('movieDuration');
                const movieDescription = document.getElementById('movieDescription');
                const movieCountry = document.getElementById('movieCountry');
                const moviePosterInput = document.getElementById('moviePoster');
                
                if (!movieTitle || !movieDuration || !movieDescription || !movieCountry) {
                    alert('Не все элементы формы найдены!');
                    return;
                }
                
                const title = movieTitle.value.trim();
                const duration = movieDuration.value.trim();
                const description = movieDescription.value.trim();
                const country = movieCountry.value.trim();
                
                if (!title) {
                    alert('Введите название фильма!');
                    return;
                }
                
                if (!duration || isNaN(duration) || parseInt(duration) <= 0) {
                    alert('Введите корректную продолжительность фильма!');
                    return;
                }
                
                if (!description) {
                    alert('Введите описание фильма!');
                    return;
                }
                
                if (!country) {
                    alert('Введите страну производства!');
                    return;
                }
                
                const handleFileRead = () => {
                    return new Promise((resolve) => {
                        let posterBase64 = null;
                        
                        if (moviePosterInput && moviePosterInput.files && moviePosterInput.files[0]) {
                            const file = moviePosterInput.files[0];
                            const reader = new FileReader();
                            
                            reader.onload = function(event) {
                                posterBase64 = event.target.result;
                                resolve(posterBase64);
                            };
                            
                            reader.readAsDataURL(file);
                        } else {
                            posterBase64 = 'images/posters/default.jpg';
                            resolve(posterBase64);
                        }
                    });
                };
                
                handleFileRead().then((posterData) => {
                    const newMovie = {
                        id: 'movie_' + Date.now(),
                        title: title,
                        duration: parseInt(duration),
                        description: description,
                        country: country,
                        poster: posterData 
                    };
                    
                    movies.push(newMovie);
                    saveMovies();
                    renderMoviesList();
                    
                    closeMovieModal();
                    
                    movieTitle.value = '';
                    movieDuration.value = '';
                    movieDescription.value = '';
                    movieCountry.value = '';
                    if (moviePosterInput) {
                        moviePosterInput.value = '';
                    }
                    
                    alert(`Фильм "${title}" успешно добавлен!`);
                });
            });
        }
    }

    function renderHallTabs() {
        if (!hallTabs) return;
        
        hallTabs.innerHTML = '';
        halls.forEach(hall => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.textContent = hall.name || `ЗАЛ ${hall.id}`;
            btn.dataset.hallId = hall.id;
            btn.addEventListener('click', () => setActiveHall(hall.id));
            hallTabs.appendChild(btn);
        });
    }

    function renderPriceHallTabs() {
        if (!priceHallTabs) return;
        
        priceHallTabs.innerHTML = '';
        halls.forEach(hall => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.textContent = hall.name || `ЗАЛ ${hall.id}`;
            btn.dataset.hallId = hall.id;
            btn.addEventListener('click', () => setActivePriceHall(hall.id));
            priceHallTabs.appendChild(btn);
        });
    }

    function setActiveHall(hallId) {
        activeHallId = hallId;
        document.querySelectorAll('#hall-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.hallId === hallId);
        });
    
        const hall = getActiveHall();
        if (hall) {
            rowsInput.value = hall.rows;
            seatsInput.value = hall.seats;
            renderHall();
        }
    }

    function setActivePriceHall(hallId) {
        activePriceHallId = hallId;
        
        document.querySelectorAll('#price-hall-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.hallId === hallId);
        });
        
        document.querySelectorAll('#sales-hall-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.hallId === hallId);
        });
    
        loadHallPrices(hallId);
        updateSalesButtonState();
    }

    function renderHallList() {
        if (!hallList) return;
        
        hallList.innerHTML = '';
        halls.forEach(hall => {
            const li = document.createElement('li');
            li.dataset.hallId = hall.id;
            li.innerHTML = `
                – ${hall.name || `ЗАЛ ${hall.id}`}
                <button class="icon-btn delete-hall" aria-label="Удалить зал">
                    <img src="svg/trashcanButton.svg" alt="">
                </button>
            `;
            li.querySelector('.delete-hall').addEventListener('click', () => deleteHall(hall.id));
            hallList.appendChild(li);
        });
    }

    function renderMoviesList() {
        const moviesList = document.querySelector('.movies-list');
        if (!moviesList) return;
    
        moviesList.innerHTML = '';
    
        movies.forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.draggable = true;
            movieCard.dataset.title = movie.title;
            movieCard.dataset.duration = movie.duration;
            movieCard.dataset.movieId = movie.id;
    
            const contentDiv = document.createElement('div');
            contentDiv.style.display = 'flex';
            contentDiv.style.alignItems = 'center';
            contentDiv.style.gap = '10px';
            contentDiv.style.position = 'relative';
    
            const posterImg = document.createElement('img');
            posterImg.src = movie.poster || 'images/posters/default.jpg';
            posterImg.alt = movie.title;
            posterImg.className = 'movie-poster';

    
            const textDiv = document.createElement('div');
            textDiv.innerHTML = `
                <div class="movie-title">${movie.title}</div>
                <div class="movie-duration">${movie.duration} минут</div>
            `;
    
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-btn delete-movie';
            deleteBtn.setAttribute('aria-label', 'Удалить фильм');
            deleteBtn.dataset.movieId = movie.id;
            deleteBtn.innerHTML = `<img src="svg/trashcanButton.svg" alt="">`;
            deleteBtn.addEventListener('click', e => {
                e.stopPropagation();
                deleteMovie(movie.id);
            });
    
            contentDiv.appendChild(posterImg);
            contentDiv.appendChild(textDiv);
            contentDiv.appendChild(deleteBtn);
    
            movieCard.appendChild(contentDiv);
            moviesList.appendChild(movieCard);
        });
    
        setupMovieDrag();
    }      

    function deleteMovie(movieId) {
        if (!confirm('Удалить этот фильм?')) return;
        
        movies = movies.filter(m => m.id !== movieId);
        
        halls.forEach(hall => {
            if (hall.sessions) {
                hall.sessions = hall.sessions.filter(session => 
                    !session.movieId || session.movieId !== movieId
                );
            }
        });
        
        saveMovies();
        saveHalls();
        renderMoviesList();
        renderSessionsGrid();
    }

    function renderSessionsGrid() {
        const hallContainer = document.querySelector('.timeline-container');
        if (!hallContainer) return;

        const timelinesWrapper = hallContainer.querySelector('.timelines-wrapper');
        if (!timelinesWrapper) return;
    
        timelinesWrapper.innerHTML = '';
    
        halls.forEach(hall => {
            const hallDiv = document.createElement('div');
            hallDiv.className = 'hall';
            
            const hallTitle = document.createElement('div');
            hallTitle.className = 'hall-title';
            hallTitle.textContent = hall.name || `ЗАЛ ${hall.id}`;
            
            const timeline = document.createElement('div');
            timeline.className = 'timeline';
            timeline.dataset.hallId = hall.id;
            
            hallDiv.appendChild(hallTitle);
            hallDiv.appendChild(timeline);
            
            timelinesWrapper.appendChild(hallDiv);
    
            loadSessionsForHall(timeline, hall);
        });
    
        setupTimelineDrag();
    }    

function loadSessionsForHall(timelineElement, hall) {
    if (!hall.sessions || !Array.isArray(hall.sessions)) {
        hall.sessions = [];
    }
    
    timelineElement.innerHTML = '';
    
    hall.sessions.forEach(session => {
        renderSession(session, timelineElement);
    });
}

function deleteHall(hallId) {
    if (!confirm(`Удалить зал №${hallId}?`)) return;
    
    if (activePriceHallId === hallId) {
        activePriceHallId = null;
    }
    
    halls = halls.filter(h => h.id !== hallId);
    saveHalls();
    renderHallTabs();
    renderPriceHallTabs();
    renderSalesHallTabs();
    renderHallList();
    renderSessionsGrid();
    updateSalesButtonState();
    
    if (halls.length) {
        setActiveHall(halls[0].id);
        setActivePriceHall(halls[0].id);
    } else {
        hallGrid.innerHTML = '';
    }
}
    function renderHall() {
        const hall = getActiveHall();
        if (!hall || !hallGrid) return;

        hall.rows = Number(rowsInput.value);
        hall.seats = Number(seatsInput.value);

        const totalSeats = hall.rows * hall.seats;
        if (hall.layout.length !== totalSeats) hall.layout = Array(totalSeats).fill('normal');

        hallGrid.innerHTML = '';
        hallGrid.style.gridTemplateColumns = `repeat(${hall.seats}, 20px)`;

        hall.layout.forEach((type, index) => {
            const seat = document.createElement('div');
            seat.className = `seat ${type}`;

            if (type === 'vip') {
                seat.style.background = 'none';
                seat.innerHTML = `
                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0.5" y="0.5" width="25" height="25" rx="3.5" fill="#B0D6D8"/>
                        <rect x="0.5" y="0.5" width="25" height="25" rx="3.5" fill="url(#pattern0_16_958)"/>
                        <rect x="0.5" y="0.5" width="25" height="25" rx="3.5" stroke="#0A828A"/>
                        <defs>
                            <pattern id="pattern0_16_958" patternContentUnits="objectBoundingBox" width="0.115385" height="0.115385">
                                <use xlink:href="#image0_16_958" transform="scale(0.0384615)"/>
                            </pattern>
                        </defs>
                    </svg>
                `;
            } else if (type === 'normal') {
                seat.style.background = '#C4C4C4';
                seat.style.border = '1px solid #393939';
                seat.textContent = '';
            } else if (type === 'disabled') {
                seat.style.background = 'none';
                seat.style.border = '1px solid #C4C4C4';
                seat.textContent = '';
            }

            seat.addEventListener('click', () => {
                hall.layout[index] = toggleSeatType(type);
                renderHall();
            });

            hallGrid.appendChild(seat);
        });

        saveHalls();
    }

    function toggleSeatType(type) {
        if (type === 'normal') return 'vip';
        if (type === 'vip') return 'disabled';
        return 'normal';
    }

    rowsInput.addEventListener('change', renderHall);
    seatsInput.addEventListener('change', renderHall);

    function getActiveHall() {
        return halls.find(h => h.id === activeHallId);
    }

    function saveHalls() {
        halls.forEach(hall => {
            if (!hall.layout) hall.layout = Array(hall.rows * hall.seats).fill('normal');
            if (!hall.sessions) hall.sessions = [];
            if (!hall.prices) hall.prices = { normal: 300, vip: 500 };
            if (hall.salesOpen === undefined) hall.salesOpen = false;
        });
        
        localStorage.setItem('halls', JSON.stringify(halls));
    }

    function saveMovies() {
        localStorage.setItem('movies', JSON.stringify(movies));
    }

    function loadHallPrices(hallId) {
        const hall = halls.find(h => h.id === hallId);
        if (!hall) return;
        
        if (!hall.prices) {
            hall.prices = { normal: 300, vip: 500 };
        }
        
        const priceInputs = document.querySelectorAll('#price-hall-tabs ~ .price-inputs .input-field');
        if (priceInputs.length >= 2) {
            priceInputs[0].value = hall.prices.normal || 300;
            priceInputs[1].value = hall.prices.vip || 500;
        }
    }

    function saveHallPrices() {
        const hall = halls.find(h => h.id === activePriceHallId);
        if (!hall) return;
        
        const priceInputs = document.querySelectorAll('#price-hall-tabs ~ .price-inputs .input-field');
        if (priceInputs.length >= 2) {
            const normalPrice = parseInt(priceInputs[0].value) || 300;
            const vipPrice = parseInt(priceInputs[1].value) || 500;
            
            hall.prices = {
                normal: normalPrice,
                vip: vipPrice
            };
            
            saveHalls();
            alert(`Цены для ${hall.name || `ЗАЛ ${hall.id}`} сохранены!`);
        }
    }

    function setupPriceConfiguration() {
        const cancelPriceBtn = document.querySelector('#price-hall-tabs ~ .actions .secondary-btn');
        const savePriceBtn = document.querySelector('#price-hall-tabs ~ .actions .primary-btn');
        
        if (cancelPriceBtn) {
            cancelPriceBtn.addEventListener('click', () => {
                if (activePriceHallId) {
                    loadHallPrices(activePriceHallId);
                }
            });
        }
        
        if (savePriceBtn) {
            savePriceBtn.addEventListener('click', saveHallPrices);
        }
    }

    let draggedElement = null;
    let draggedType = null;
    let pendingSession = null;

    const sessionModal = document.getElementById('sessionModal');
    const modalConfirmAdd = document.querySelector('#sessionModal .add-btn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const trash = document.querySelector('.trash');

    function setupMovieDrag() {
        document.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedElement = card;
                draggedType = 'movie';
                e.dataTransfer.setData('text/plain', card.dataset.title);
            });
        });
    }

    function setupTimelineDrag() {
        document.querySelectorAll('.timeline').forEach(timeline => {
            timeline.addEventListener('dragover', (e) => {
                e.preventDefault();
                timeline.classList.add('drag-over');
            });

            timeline.addEventListener('dragleave', () => {
                timeline.classList.remove('drag-over');
            });

            timeline.addEventListener('drop', (e) => {
                e.preventDefault();
                timeline.classList.remove('drag-over');

                if (draggedType !== 'movie') return;

                const hallId = timeline.dataset.hallId;
                const hall = halls.find(h => h.id === hallId);
                const hallNameInput = document.getElementById('hallName');
                const movieNameInput = document.getElementById('movieName');
                const startTimeInput = document.getElementById('startTime');
                
                if (hallNameInput) hallNameInput.value = hall?.name || `ЗАЛ ${hallId}`;
                if (movieNameInput) movieNameInput.value = draggedElement.dataset.title;
                if (startTimeInput) startTimeInput.value = '';

                pendingSession = {
                    timeline,
                    title: draggedElement.dataset.title,
                    duration: Number(draggedElement.dataset.duration),
                    hallId: hallId,
                    startMinutes: null,
                    movieId: draggedElement.dataset.movieId
                };

                if (sessionModal) {
                    sessionModal.classList.remove('hidden');
                }
            });
        });
    }

    function closeSessionModal() {
        if (sessionModal) sessionModal.classList.add('hidden');
        pendingSession = null;
    }

    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeSessionModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeSessionModal);
    if (sessionModal) sessionModal.addEventListener('click', e => { if (e.target === sessionModal) closeSessionModal(); });

    if (modalConfirmAdd) {
        modalConfirmAdd.addEventListener('click', () => {
            if (!pendingSession) return;
            const startTimeInput = document.getElementById('startTime');
            if (!startTimeInput) return;
            
            const startTimeValue = startTimeInput.value;
            if (!startTimeValue) {
                alert('Введите время начала сеанса!');
                return;
            }

            const [h, m] = startTimeValue.split(':').map(Number);
            if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
                alert('Введите корректное время в формате ЧЧ:ММ');
                return;
            }
            
            pendingSession.startMinutes = h * 60 + m;

            const hall = halls.find(h => h.id === pendingSession.hallId);
            if (hall) {
                if (!hall.sessions) hall.sessions = [];
                hall.sessions.push({...pendingSession});
                saveHalls();
                renderSessionsGrid();
            }

            closeSessionModal();
        });
    }

    function renderSession(sessionData, timeline) {
        if (!sessionData || !sessionData.title || sessionData.startMinutes === null || !sessionData.duration) {
            console.error('Некорректные данные сеанса:', sessionData);
            return;
        }
        
        const session = document.createElement('div');
        session.classList.add('session');
        session.textContent = sessionData.title;
        session.dataset.title = sessionData.title;
        session.dataset.startMinutes = sessionData.startMinutes;
        session.dataset.duration = sessionData.duration;
        session.dataset.sessionId = Date.now();
        
        const startPercent = (sessionData.startMinutes / 1440) * 100;
        const widthPercent = (sessionData.duration / 1440) * 100;
        
        session.style.position = 'absolute';
        session.style.left = `${startPercent}%`;
        session.style.width = `${widthPercent}%`;

        session.style.position = 'absolute';
        session.style.left = `${startPercent}%`;
        session.style.width = `${widthPercent}%`;
        session.style.top = '50%';
        session.style.transform = 'translateY(-50%)';
        session.style.textAlign = 'center';
        session.style.cursor = 'pointer';
        
        session.setAttribute('draggable', 'true');
        session.addEventListener('dragstart', (e) => {
            draggedElement = session;
            draggedType = 'session';
            e.dataTransfer.setData('text/plain', sessionData.title);
            
            if (trash) {
                trash.style.display = 'flex';
            }
        });
        
        timeline.appendChild(session);
        
        const timeLabel = document.createElement('div');
        timeLabel.classList.add('time-label');
        timeLabel.textContent = formatTime(sessionData.startMinutes);
        timeLabel.style.position = 'absolute';
        timeLabel.style.left = `${startPercent}%`;
        timeLabel.style.bottom = '-25px';
        timeLabel.style.transform = 'translateX(-50%)';
        timeLabel.style.fontSize = '12px';
        timeLabel.style.color = '#666';
        
        const existingLabels = timeline.querySelectorAll('.time-label');
        existingLabels.forEach(label => {
            const labelLeft = parseFloat(label.style.left);
            if (Math.abs(labelLeft - startPercent) < 5) {
                timeLabel.style.display = 'none';
            }
        });
        
        timeline.appendChild(timeLabel);
    }
    
    if (trash) {
        trash.style.display = 'none';
        
        trash.addEventListener('dragover', (e) => { 
            e.preventDefault(); 
            trash.classList.add('drag-over'); 
        });
        
        trash.addEventListener('dragleave', () => {
            trash.classList.remove('drag-over');
        });
        
        trash.addEventListener('drop', (e) => {
            e.preventDefault();
            trash.classList.remove('drag-over');
            trash.style.display = 'none';
            
            if (draggedType === 'session') {
                const sessionElement = draggedElement;
                const timeline = sessionElement.closest('.timeline');
                const hallId = timeline?.dataset.hallId;
                
                if (hallId) {
                    const hall = halls.find(h => h.id === hallId);
                    if (hall && hall.sessions) {
                        hall.sessions = hall.sessions.filter(s => 
                            s.title !== sessionElement.dataset.title ||
                            s.startMinutes !== parseInt(sessionElement.dataset.startMinutes)
                        );
                        saveHalls();
                    }
                }
                
                const timeLabels = timeline.querySelectorAll('.time-label');
                timeLabels.forEach(label => {
                    const sessionTime = formatTime(parseInt(sessionElement.dataset.startMinutes));
                    if (label.textContent === sessionTime) {
                        label.remove();
                    }
                });
                
                sessionElement.remove();
            }
        });

        document.addEventListener('dragend', () => {
            if (trash) {
                trash.classList.remove('drag-over');
                trash.style.display = 'none';
            }
        });
    }
    
    function formatTime(minutes) {
        const h = String(Math.floor(minutes / 60)).padStart(2, '0');
        const m = String(minutes % 60).padStart(2, '0');
        return `${h}:${m}`;
    }

    const addHallBtn = document.querySelector('.add-hall');
    const hallModal = document.getElementById('hallModal');
    const closeHallModalBtn = document.getElementById('closeHallModal');
    const cancelAddHall = document.getElementById('cancelAddHall');
    const confirmAddHall = document.getElementById('confirmAddHall');
    
    if (addHallBtn && hallModal && closeHallModalBtn && cancelAddHall && confirmAddHall) {
        addHallBtn.addEventListener('click', () => {
            hallModal.classList.remove('hidden');
        });
        
        function closeHallModal() {
            hallModal.classList.add('hidden');
        }
        
        closeHallModalBtn.addEventListener('click', closeHallModal);
        cancelAddHall.addEventListener('click', closeHallModal);
        hallModal.addEventListener('click', (e) => {
            if (e.target === hallModal) {
                closeHallModal();
            }
        });
        
        confirmAddHall.addEventListener('click', () => {
            const nameInput = document.getElementById('newNameHall');
            const hallName = nameInput.value.trim();
        
            if (!hallName) {
                alert('Введите название зала');
                return;
            }
        
            const newId = 'hall_' + Date.now();
        
            const newHall = {
                id: newId,
                name: hallName,
                rows: 5,
                seats: 6,
                layout: Array(5 * 6).fill('normal'),
                sessions: [],
                prices: { normal: 300, vip: 500 },
                salesOpen: false
            };
        
            halls.push(newHall);
            saveHalls();
            renderHallTabs();
            renderPriceHallTabs();
            renderSalesHallTabs();
            renderHallList();
            renderSessionsGrid();
            setActiveHall(newHall.id);
            setActivePriceHall(newHall.id);
        
            nameInput.value = '';
            closeHallModal();
        });
    }
    
    setupPriceConfiguration();
});

function formatTime(minutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2,'0');
    const m = String(minutes % 60).padStart(2,'0');
    return `${h}:${m}`;
}