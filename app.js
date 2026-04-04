let fishDB = [];
let selectedFish = [];

fetch("fish.json")
.then(res => res.json())
.then(data => {
fishDB = data;
populate();
});


function populate() {
    const input = document.getElementById("fishInput");
    const select = document.getElementById("fishSelect");

    // Sort fish alphabetically
    const sortedFish = [...fishDB].map((fish, idx) => ({fish, idx}))
                                  .sort((a,b) => a.fish.latin_name.localeCompare(b.fish.latin_name));

    // Populate select with all fish
    sortedFish.forEach(({fish, idx}) => {
        let option = document.createElement("option");
        option.value = idx; // original index in fishDB
        option.text = `${fish.latin_name} (${fish.common_name || "Unknown"})`;
        select.appendChild(option);
    });
    // Clear and Initial Fill
    renderSelectOptions(fishDB);

    // Filter as you type
    input.addEventListener("input", () => {
        let query = input.value.toLowerCase();
        filterFish(query);
    });

    // When user clicks a fish in the select
    select.addEventListener("change", () => {
        let idx = select.value;
        if(idx !== ""){
            input.value = fishDB[idx].latin_name; // use original index
        }
    });
    // Enter to select the first option
    input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault(); // prevent form submission if inside a form

        const select = document.getElementById("fishSelect");

        // Get the first visible option
        const firstOption = Array.from(select.options).find(opt => opt.style.display !== "none");

        if(firstOption){
            select.value = firstOption.value; // select the first matching fish
            addFish(); // add it
            input.value = ""; // clear input
            filterFish("");
        }
    }
});
}

// Filter function
function filterFish(query) {
    const filtered = fishDB.filter(fish => {
        const latin = fish.latin_name.toLowerCase();
        const common = (fish.common_name || "").toLowerCase();
        // Returns true if the query (chain of words) exists in either name
        return latin.includes(query) || common.includes(query);
    });

    renderSelectOptions(filtered);

    if (filtered.length > 0) {
        document.getElementById("fishSelect").selectedIndex = 0;
    }
    /**
    let select = document.getElementById("fishSelect");
    let filtered = [...fishDB].filter(fish => 
        fish.latin_name.toLowerCase().includes(query.toLowerCase()) ||
        (fish.common_name && fish.common_name.toLowerCase().includes(query.toLowerCase()))
    ).sort((a,b)=> a.latin_name.localeCompare(b.latin_name));

    select.innerHTML = "";

    filtered.forEach(fish => {
        let index = fishDB.findIndex(f => f.latin_name === fish.latin_name);
        let option = document.createElement("option");
        option.value = index;
        option.text = `${fish.latin_name} (${fish.common_name || "Unknown"})`;
        select.appendChild(option);
    });

    // Show select only if results exist
    select.style.display = filtered.length ? "block" : "none";

    if(filtered.length){
        document.getElementById("fishSelect").selectedIndex = 0;
    }
    */
}

function renderSelectOptions(fishArray) {
    const select = document.getElementById("fishSelect");
    select.innerHTML = ""; 

    const sorted = [...fishArray].sort((a, b) => a.latin_name.localeCompare(b.latin_name));

    sorted.forEach(fish => {
        let originalIndex = fishDB.findIndex(f => f.latin_name === fish.latin_name);
        let option = document.createElement("option");
        option.value = originalIndex;
        option.text = `${fish.latin_name} (${fish.common_name || "Unknown"})`;
        
        // Save the photo path into the option tag
        if(fish.photo) {
            option.setAttribute('data-photo', fish.photo);
        }
        
        select.appendChild(option);
    });

    select.style.display = sorted.length ? "block" : "none";
}

// Hover logic - Place this inside or after your populate() function
document.addEventListener('mousemove', function(e) {
    const previewDiv = document.getElementById("fishPreview");
    const previewImg = document.getElementById("previewImg");
    const select = document.getElementById("fishSelect");

    // Check if we are hovering over the select box
    if (e.target.tagName === 'OPTION' && e.target.parentElement.id === 'fishSelect') {
        const photoUrl = e.target.getAttribute('data-photo');
        
        if (photoUrl) {
            previewImg.src = photoUrl;
            previewDiv.style.display = "block";
            // Position the image next to the cursor
            previewDiv.style.left = (e.clientX + 15) + "px";
            previewDiv.style.top = (e.clientY + 15) + "px";
        } else {
            previewDiv.style.display = "none";
        }
    } else {
        // Hide if the mouse moves away from an option
        if (previewDiv) previewDiv.style.display = "none";
    }
});

function addFish() {
    const input = document.getElementById("fishInput");
    const select = document.getElementById("fishSelect");
    let index = select.value;
    let amount = parseInt(document.getElementById("amount").value) || 1;

    // Prevent adding if nothing is selected
    if(index === "" || !fishDB[index]) return;

    let existing = selectedFish.find(f => f.latin_name === fishDB[index].latin_name);

    if(existing){
        existing.amount += amount;
    }else{
        selectedFish.push({
            ...fishDB[index],
            amount: amount
        });
    }

    // Reset UI after adding
    input.value = "";
    filterFish("");

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

// Track shrimp/snails
let shrimpPresent = selectedFish.some(f=>f.category==="shrimp");
let snailPresent = selectedFish.some(f=>f.category==="snail");

// Track activity
let activityLevels = selectedFish.map(f=>f.activity);

// Temperature & PH arrays
let tempMins = [];
let tempMaxs = [];
let phMins = [];
let phMaxs = [];

selectedFish.forEach(fish=>{

    // Tank type compatibility
    if(fish.type === document.getElementById("tankType").value){
        total += fish.size_cm * fish.amount;
    }else{
        wrongType = true;
    }

    // Collect temperature
    if(fish.temperature){
        tempMins.push(fish.temperature[0]);
        tempMaxs.push(fish.temperature[1]);
    }

    // Collect PH
    if(fish.ph){
        phMins.push(fish.ph[0]);
        phMaxs.push(fish.ph[fish.ph.length - 1]);
    }

    // Schooling warning
    if (fish.schooling && fish.amount < fish.min_school) {
        warnings +=
        `<div class="warning">
        ${fish.latin_name} needs at least ${fish.min_school} fish
        </div>`;
    }

    // MOVED FROM POPULATE TO CALCULATE: Max group/Pair logic
    if (fish.max_group === 1) {
        if (fish.amount === 2) {
            warnings += `<div class="warning-yellow">${fish.latin_name} can only be in pairs when breeding</div>`;
        } else if (fish.amount > 2) {
            warnings += `<div class="warning-yellow">${fish.latin_name} cannot be kept in groups</div>`;
        }
    } else if (fish.max_group && fish.amount > fish.max_group) {
        warnings += `<div class="warning-yellow">${fish.latin_name} max group size is ${fish.max_group}</div>`;
    }

    // Shrimp/snail warning
    if(shrimpPresent && fish.eat_shrimp){
    warnings += `<div class="warning">${fish.latin_name} may eat shrimp!</div>`;
    }

    if(snailPresent && fish.eat_snails){
    warnings += `<div class="warning">${fish.latin_name} may eat snails!</div>`;
    }

    // algae warning
    if(fish.needs_algae && !document.getElementById("planted").checked){
    warnings += `<div class="warning">${fish.latin_name} needs algae / mature tank</div>`;
    }

});

// Tank type warning
if(wrongType){
warnings += `<div class="warning">Some fish are not compatible with tank type</div>`;
}

// Energy compatibility
if(activityLevels.length > 1){

let values = activityLevels.map(a=>{
if(a==="low") return 1;
if(a==="medium") return 2;
if(a==="high") return 3;
});

let diff = Math.max(...values) - Math.min(...values);

if(diff >= 2){
warnings += `<div class="warning">High and low energy fish detected</div>`;
}

}

// Calculate temperature overlap

let tempText = "";
let phText = "";

if(tempMins.length){

let minTemp = Math.max(...tempMins);
let maxTemp = Math.min(...tempMaxs);

if(minTemp <= maxTemp){
tempText = `Temperature: ${minTemp}°C - ${maxTemp}°C (most fish can tolerate a few degrees outside their range)`;
}else{
tempText = `<div class="warning">No temperature overlap</div>`;
}

}

// Calculate PH overlap

if(phMins.length){

let minPh = Math.max(...phMins);
let maxPh = Math.min(...phMaxs);

if(minPh <= maxPh){
phText = `PH: ${minPh} - ${maxPh}`;
}else{
phText = `<div class="warning">No PH overlap</div>`;
}

}

let percent = (total / tank) * 100;

let capacityEl = document.getElementById("capacity");

if (percent > 100) {
    capacityEl.classList.add("overstock");

    let requiredLiters = total; // total stocking load = required tank size
    let requiredGallons = requiredLiters / 3.785;

    capacityEl.innerHTML = `
    Capacity: ${percent.toFixed(1)}%
    <br>
    You will need ${requiredLiters.toFixed(1)} Liters / ${requiredGallons.toFixed(1)} Gallons
    `;
} else {
    capacityEl.classList.remove("overstock");
    capacityEl.innerHTML = `Capacity: ${percent.toFixed(1)}%`;
}

document.getElementById("temperatureRange").innerHTML = tempText;
document.getElementById("phRange").innerHTML = phText;

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