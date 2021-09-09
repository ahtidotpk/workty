'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const sidebar = document.querySelector('.sidebar');

const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const btn = document.querySelectorAll('.btn');
const edit = document.querySelector('.workout__edit');

const clear = document.querySelector('.clear');
const sort = document.querySelector('.sort');
class Workout {
  click = 0;
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  workoutDiscription() {
    this.discription = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  clickCount() {
    return this.click++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this.workoutDiscription();
  }

  calcPace() {
    this.pace = this.distance / this.duration;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.workoutDiscription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////

class App {
  #mapEvent;
  #map;
  #workouts = [];
  #edit = false;
  #editId;
  #sort = false;
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    this._activateBtns();

    form.addEventListener('submit', this._newWorkout.bind(this));
    // form.addEventListener('submit', this._editWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    sidebar.addEventListener('click', this._extraFunctions.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    clear.addEventListener('click', this.reset);
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        console.log(`We could not get the location please clean your cache!`);
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    /////////////////////////////////////////////////

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on(`click`, this._showForm?.bind(this));

    this.#workouts.forEach(workout => {
      this.buildWorkout(workout);
    });
  }

  _showForm(mapEvent) {
    this.#mapEvent = mapEvent;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // get data
    //////////////////////////////////////////////////////////////
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let lat, lng;
    if (this.#mapEvent != undefined) {
      ({ lat, lng } = this.#mapEvent.latlng);
    }
    let workout;
    //////////////////////////////////////////////////////////////

    // check if valid
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Input needs to be positive');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs to be possitive');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    if (this.#edit) {
      const coords = this.#workouts[this.#editId].coords;
      this.#workouts[this.#editId] = workout;
      this.#workouts[this.#editId].coords = coords;
    }

    //clears the inputs
    this._clearInput();

    //hides the form
    this._hideForm();

    if (!this.#edit) {
      this.#workouts.push(workout);
      this.buildWorkout(workout);
    }

    //set local storage
    this._setLocalStorage();

    this._activateBtns();
    if (this.#editId) {
      location.reload();
    }
  }

  _clearInput() {
    //clear input fields
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
  }

  _hideForm() {
    form.style.display = `none`;
    form.classList.toggle('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  buildWorkout = workout => {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          autoClose: false,
          minWidth: 100,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === `cycling` ? `🚴‍♀️` : '🏃‍♂️'} ${workout.discription}`
      )
      .openPopup();

    this.displayWorkout();
  };

  displayWorkout = (sort = false) => {
    const workouts =
      sort === true
        ? this.#workouts.sort(function (a, b) {
            if (a.distance < b.distance) return -1;
            if (a.distance > b.distance) return 1;
            return 0;
          })
        : this.#workouts;

    let decendance;
    let decision;
    let workoutUnit;
    let stepUnit;

    document.querySelectorAll('.workout').forEach(val => val.remove());
    workouts.forEach((workout, i) => {
      if (workout.type === `running`) {
        decendance = workout.pace.toFixed(1);
        decision = workout.cadence;
        workoutUnit = `min/km`;
        stepUnit = 'spm';
      } else {
        decendance = workout.speed.toFixed(1);
        decision = workout.elevationGain;
        workoutUnit = `km/h`;
        stepUnit = 'm';
      }

      const html = `<li class="workout workout--${workout.type}" data-id="${
        workout.id
      }" data-set="${i}">
          <h2 class="workout__title">${workout.discription}</h2>
          <span class="workout__delete">X</span>
          <span class="workout__edit">***</span>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === `cycling` ? `🚴‍♀️` : '🏃‍♂️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${decendance}</span>
            <span class="workout__unit">${workoutUnit}</span>
          </div>
          <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${decision}</span>
            <span class="workout__unit">${stepUnit}</span>
          </div>
        </li>`;
      form.insertAdjacentHTML('afterend', html);
    });
  };

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(val => val.id === workoutEl.dataset.id);
    if (e.target.closest('.workout')) {
      this.#map.setView(workout.coords, 15);
    }
  }

  _editWorkout(e) {
    if (e.target.closest('.workout__edit')) {
      this.#edit = true;
      this.#editId = e.target.parentElement.dataset.set;
      const form = containerWorkouts.children.item('form');
      form.className = 'form';
      form.children[0].remove();
      e.target.parentElement.replaceWith(form);
    }
  }

  _extraFunctions(e) {
    //delete the workout
    if (e.target.closest('.workout__delete')) {
      const element = e.target.parentElement;
      const set = element.dataset.set;
      const permision = prompt(
        'You are deleting the workout Are you sure?\n yes/no'
      );
      permision === 'yes' ? this.#workouts.splice(set, 1) : '';
      this.displayWorkout();
      this._setLocalStorage();
      location.reload();
    }

    //sort the workout
    if (e.target.closest('.sort')) {
      this.displayWorkout(!this.sort);
      this.sort = !this.sort;
    }

    //zoom all the workouts on map
    if (e.target.closest('.zoom')) {
      this.#map.setView([12, 13], 15);
    }
  }

  reset() {
    const permision = prompt(
      'You are deleting all workouts? Are you sure?\n yes/no'
    );
    permision === 'yes' ? localStorage.removeItem('workouts') : '';
    location.reload();
  }

  _activateBtns() {
    btn.forEach(val => (val.style.display = 'none'));
    if (this.#workouts.length > 0) {
      btn.forEach(val => (val.style.display = 'block'));
    }
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this.displayWorkout(workout);
    });
  }
}

const app = new App();
