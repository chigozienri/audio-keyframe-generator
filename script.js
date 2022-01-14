
// Set up audio context
window.AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
let currentBuffer = null;

const audio = document.querySelector("#audio");
const framerate = document.querySelector("#framerate");
framerate.value = 12;
const fn = document.querySelector("#fn");
fn.value = 'x';
const analyse = document.querySelector("#analyse");
analyse.onclick = () => {
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


let decimalPrecision = 2;

function readFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    contentProxy.base64 = event.target.result;
  });

  reader.addEventListener("progress", (event) => {
    if (event.loaded && event.total) {
      const percent = (event.loaded / event.total) * 100;
      console.log(`Upload progress: ${Math.round(percent)}`);
    }
  });
  reader.readAsDataURL(file);
}

function getString(arr) {
  let string = "";
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
  // let nChannels = audioBuffer.numberOfChannels;
  // let merger = new ChannelMergerNode(audioContext, {numberOfInputs: 1, channelCount: 1, channelCountMode: 'explicit'});
  // let audioBufferSourceNode = new AudioBufferSourceNode(audioContext, {buffer: audioBuffer})
  // audioBufferSourceNode.connect(merger, 0, 0);
  // console.log(merger);
//   var analyser = audioContext.createAnalyser();
//   analyser.fftSize = 2048;
//   var bufferLength = analyser.frequencyBinCount;
//   var dataArray = new Uint8Array(bufferLength);
//   analyser.getByteTimeDomainData(dataArray);
  
//   audioBufferSourceNode.connect(analyser);
//   console.log(dataArray);
//   audioBufferSourceNode.connect(audioContext.destination)
  
  
  // Average between channels. Take abs so we don't have phase issues (and we eventually want absolute value anyway, for volume).
  function addAbsArrayElements(a,b){
    return a.map((e,i) => Math.abs(e) + Math.abs(b[i]));
  }
  let channels = []
  for (let i=0; i<audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }
  const rawData = channels.reduce(addAbsArrayElements).map((x) => x/audioBuffer.numberOfChannels);
  // const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
  const samples = audioBuffer.duration * framerate.value; //rawData.length; // Number of samples we want to have in our final data set
  const blockSize = Math.floor(rawData.length / samples); // Number of samples in each subdivision
  var filteredData = [];
  for (let i = 0; i < samples; i++) {
    let chunk = rawData.slice(i * blockSize, (i + 1) * blockSize - 1)
    let sum = chunk.reduce((a, b) => a + b, 0);
    filteredData.push(sum/chunk.length);
  }
  let max = Math.max(...filteredData); // Normalise - maybe not ideal.
  // const Parser = require('expr-eval').Parser;
  const parser = new Parser();
  let expr = parser.parse(fn.value);
  filteredData = filteredData.map((x) => x/max).map((x) => expr.evaluate({ x: x }));
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
