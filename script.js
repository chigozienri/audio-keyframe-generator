
// Set up audio context
window.AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
let currentBuffer = null;

const audio = document.querySelector("#audio");
audio.onchange = () => {
  readFile(audio.files[0]);
}; 
const output = document.querySelector("#output");
const copy = document.querySelector("#copy");

copy.onclick = () => {
  window.prompt("Copy to clipboard: Ctrl+C, Enter", output.innerHTML);
};

let content = {};
let contentProxy = new Proxy(content, {
  set: function (target, key, value) {
    if (key == "base64") {
      play(value);
    }
    target[key] = value;
    return true;
  },
});

function readFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    contentProxy.base64 = event.target.result;
  });

  reader.addEventListener("progress", (event) => {
    if (event.loaded && event.total) {
      const percent = (event.loaded / event.total) * 100;
      console.log(`Progress: ${Math.round(percent)}`);
    }
  });
  reader.readAsDataURL(file);
}

function getString(arr) {
  let string = "";
  let decimalPrecision = 2;
  for (let ind of Object.keys(arr)) {
    let sample = arr[ind];
    string = string.concat(
      `${ind}: (${parseFloat(sample).toFixed(decimalPrecision)})`
    );
    if (ind < arr.length - 1) {
      string = string.concat(', ');
    }
  }
  return string;
}

function filterData(audioBuffer) {
  const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
  const samples = 70; //rawData.length; // Number of samples we want to have in our final data set
  const blockSize = Math.floor(rawData.length / samples); // Number of samples in each subdivision
  var filteredData = [];
  for (let i = 0; i < samples; i++) {
    let chunk = rawData.slice(i * blockSize, (i + 1) * blockSize - 1)
    let sum = chunk.reduce((a, b) => Math.abs(a) + Math.abs(b), 0);
    filteredData.push(sum/chunk.length);
  }
  let max = Math.max(...filteredData);
  filteredData = filteredData.map((x) => x/max)
  output.innerHTML = getString(filteredData);
  return filteredData;
}

function play(base64) {
  fetch(base64)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => filterData(audioBuffer));
  let audio = new Audio(base64);
  audio.play();
}
