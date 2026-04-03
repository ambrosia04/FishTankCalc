let fishDB = [];
let selectedFish = [];

fetch("fish.json")
.then(res => res.json())
.then(data => {
fishDB = data;
populate();
});

function populate() {
let select = document.getElementById("fishSelect");
select.innerHTML = "";

fishDB.forEach((fish, index) => {

let option = document.createElement("option");

option.value = index;
option.text = fish.latin_name;

select.appendChild(option);

});
}

function addFish() {

let index = document.getElementById("fishSelect").value;
let amount = parseInt(document.getElementById("amount").value);

let existing = selectedFish.find(f => f.latin_name === fishDB[index].latin_name);

if(existing){
existing.amount += amount;
}else{
selectedFish.push({
...fishDB[index],
amount: amount
});
}

updateList();
calculate();

}

function updateAmount(index,value){

value = parseInt(value);

if(value < 0) value = 0;

selectedFish[index].amount = value;

updateList();
calculate();

}

function removeFish(i) {

selectedFish.splice(i,1);
updateList();
calculate();

}

function updateList() {

let list = document.getElementById("fishList");
list.innerHTML = "";

selectedFish.forEach((fish,i)=>{

let li = document.createElement("li");

let invalid="";
let tankType=document.getElementById("tankType").value;

if(fish.type !== tankType){
invalid="invalid";
}

li.innerHTML=`
<span class="${invalid}">
${fish.latin_name}
</span>

<input type="number"
value="${fish.amount}"
min="0"
onchange="updateAmount(${i},this.value)">

<button onclick="removeFish(${i})">Remove</button>
`;

list.appendChild(li);

});

}

function calculate() {

let tank = getTankLiters();
let total = 0;
let warnings = "";

let wrongType = false;

selectedFish.forEach(fish=>{

// Tank type compatibility
if(fish.type === document.getElementById("tankType").value){
total += fish.size_cm * fish.amount;
}else{
wrongType = true;
}

// School size warning
if (fish.schooling && fish.amount < fish.min_school) {

warnings +=
`<div class="warning">
${fish.latin_name} needs at least ${fish.min_school}
</div>`;

}

});

// Tank type warning
if(wrongType){
warnings += `
<div class="warning">
Some fish are not compatible with the selected tank type
</div>
`;
}

let percent = (total / tank) * 100;

document.getElementById("capacity").innerHTML =
`Capacity: ${percent.toFixed(1)}%`;

document.getElementById("warnings").innerHTML = warnings;

}

function reloadTankType(){
updateList();
calculate();
}

function getTankLiters(){

let size = parseFloat(document.getElementById("tankSize").value);
let unit = document.getElementById("unit").value;

if(unit === "gallons"){
return size * 3.785;
}

return size;

}

function convertTank(){
calculate();
}

function convertMini(){

let value = document.getElementById("convertValue").value;
let from = document.getElementById("convertFrom").value;

let result;

if(from === "liters"){
result = value / 3.785;
}else{
result = value * 3.785;
}

document.getElementById("convertResult").innerHTML =
result.toFixed(2);

}