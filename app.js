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

function calculateRealVolume(){

let mode=document.getElementById("volumeMode").value;
let volume;

if(mode==="liters"){

let size=document.getElementById("tankVolumeInput").value;
let unit=document.getElementById("tankVolumeUnit").value;

if(unit==="gallons"){
volume=size*3.785;
}else{
volume=size;
}

}else{

let l=document.getElementById("length").value;
let w=document.getElementById("width").value;
let h=document.getElementById("height").value;

let unit=document.getElementById("dimensionUnit").value;

if(unit==="inch"){

l*=2.54;
w*=2.54;
h*=2.54;

}

volume=(l*w*h)/1000;

}

// substrate displacement (approx 1kg = 0.6L)
let substrate=document.getElementById("substrate").value;
let rocks=document.getElementById("rocks").value;

let substrateDisplacement=substrate*0.6;

// rocks 10x10x10 cm
let rockDisplacement=rocks*1;

let real=volume-substrateDisplacement-rockDisplacement;

let gallons=real/3.785;


document.getElementById("realVolume").innerHTML=
`
Real Volume:
<br>
${real.toFixed(1)} Liters
<br>
${gallons.toFixed(1)} Gallons
`;

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

let invalid="";
let tankType=document.getElementById("tankType").value;

if(fish.type !== tankType){
    invalid="invalid";
}

li = document.createElement("li");

li.innerHTML=`
<span class="${invalid}">
${fish.latin_name}
</span>

<input type="number"
value="${fish.amount}"
min="0"
onchange="updateAmount(${i},this.value)">

<button onclick="removeFish(${i})">Remove</button>
<br>
<small>Energy: ${fish.activity} | Aggression: ${fish.aggression}</small>
`;

list.appendChild(li);

});

}

function calculate() {

let tank = getTankLiters();
let total = 0;
let warnings = "";

let wrongType = false;

// Track shrimp/snails in tank
let shrimpPresent = selectedFish.some(f=>f.category==="shrimp");
let snailPresent = selectedFish.some(f=>f.category==="snail");

// Track max/min activity levels (for energy incompatibility)
let activityLevels = selectedFish.filter(f=>!f.category || (f.category!=="shrimp" && f.category!=="snail"))
                                 .map(f=>f.activity);

selectedFish.forEach(fish=>{

// Tank type compatibility
if(fish.type === document.getElementById("tankType").value){
    total += fish.size_cm * fish.amount;
}else{
    wrongType = true;
}

// Schooling warning
if (fish.schooling && fish.amount < fish.min_school) {
    warnings +=
    `<div class="warning">
    ${fish.latin_name} needs at least ${fish.min_school} fish
    </div>`;
}

// Shrimp/snail predation warning
if(shrimpPresent && fish.eat_shrimp){
    warnings += `<div class="warning">${fish.latin_name} may eat shrimp!</div>`;
}
if(snailPresent && fish.eat_snails){
    warnings += `<div class="warning">${fish.latin_name} may eat snails!</div>`;
}

});

// Tank type warning
if(wrongType){
    warnings += `<div class="warning">Some fish are not compatible with the selected tank type</div>`;
}

// Energy incompatibility warning
if(activityLevels.length > 1){
    let energyValues = activityLevels.map(a=>{
        if(a==="low") return 1;
        if(a==="medium") return 2;
        if(a==="high") return 3;
    });
    let diff = Math.max(...energyValues) - Math.min(...energyValues);
    if(diff >= 2){
        warnings += `<div class="warning">High and low energy fish detected: may compete for food</div>`;
    }
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

function toggleVolumeMode(){

let mode=document.getElementById("volumeMode").value;

if(mode==="liters"){

document.getElementById("volumeLiters").style.display="block";
document.getElementById("volumeDimensions").style.display="none";

}else{


document.getElementById("volumeLiters").style.display="none";
document.getElementById("volumeDimensions").style.display="block";

}

}

}