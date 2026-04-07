let fishDB = [];
let selectedFish = [];
let activeCategories = {
    fish: true,
    shrimp: true,
    snail: true,
    crab: true,
    stars: true,
    coral: true
};

fetch("fish.json")
.then(res => res.json())
.then(data => {
    fishDB = data;
    populate();
    checkEmojiSupport();
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
    updateCategoryButtons();

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
    // Auto-recalculate warnings when tank is planted
    document.getElementById("planted").addEventListener("change", () => {
        calculate();
    });
});

// Auto-calculate when user types a new tank size
document.getElementById("tankSize").addEventListener("input", calculate);

// Auto-calculate when user changes between Gallons/Liters
document.getElementById("unit").addEventListener("change", calculate);

// Auto-calculate when tank type (Marine/Freshwater) changes
document.getElementById("tankType").addEventListener("change", reloadTankType);
}

function toggleCategory(category) {
    activeCategories[category] = !activeCategories[category];

    // Optional: visual feedback (toggle class)
    const btn = document.querySelector(`[onclick="toggleCategory('${category}')"]`);
    if (btn) {
        btn.classList.toggle("inactive", !activeCategories[category]);
    }

    // Re-run filter
    const query = document.getElementById("fishInput").value.toLowerCase();
    filterFish(query);
}

function updateCategoryButtons() {
    const tankType = document.getElementById("tankType").value;

    const starsBtn = document.getElementById("btn-stars");
    const coralsBtn = document.getElementById("btn-corals");

    if (tankType === "marine") {
        starsBtn.style.display = "inline-block";
        coralsBtn.style.display = "inline-block";

        // reset state
        activeCategories.stars = true;
        activeCategories.coral = true;

        // sync UI (remove inactive look)
        starsBtn.classList.remove("inactive");
        coralsBtn.classList.remove("inactive");

    } else {
        starsBtn.style.display = "none";
        coralsBtn.style.display = "none";

        activeCategories.stars = false;
        activeCategories.coral = false;
    }
}

// Filter function
/*function filterFish(query) {
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
    
}*/

function filterFish(query) {
    const filtered = fishDB.filter(fish => {

        const latin = fish.latin_name.toLowerCase();
        const common = (fish.common_name || "").toLowerCase();

        // 🧠 CATEGORY MATCH
        let category = fish.category || "fish"; // default to fish if undefined

        if (!activeCategories[category]) return false;

        // 🔎 TEXT MATCH
        return latin.includes(query) || common.includes(query);
    });

    renderSelectOptions(filtered);

    if (filtered.length > 0) {
        document.getElementById("fishSelect").selectedIndex = 0;
    }
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
    document.getElementById("amount").value = 1;
    filterFish("");

    updateList();
    calculate();
}

function calculateRealVolume() {
    let mode = document.getElementById("volumeMode").value;
    let volume = 0;

    if (mode === "liters") {
        let size = parseFloat(document.getElementById("tankVolumeInput").value);
        let unit = document.getElementById("tankVolumeUnit").value;
        
        if (isNaN(size) || size <= 0) { alert("Please enter tank size"); return; }
        
        volume = (unit === "gallons") ? size * 3.785 : size;
    } else {
        let l = parseFloat(document.getElementById("length").value) || 0;
        let w = parseFloat(document.getElementById("width").value) || 0;
        let h = parseFloat(document.getElementById("height").value) || 0;
        let unit = document.getElementById("dimensionUnit").value;

        if (l === 0 || w === 0 || h === 0) { alert("Please enter all dimensions"); return; }

        if (unit === "inch") {
            l *= 2.54; w *= 2.54; h *= 2.54;
        }
        volume = (l * w * h) / 1000;
    }

    // Default to 0 if input is empty
    let substrate = parseFloat(document.getElementById("substrate").value) || 0;
    let rocks = parseFloat(document.getElementById("rocks").value) || 0;

    // substrate displacement (approx 1kg = 0.6L)
    let substrateDisplacement = substrate * 0.6;
    // rocks 10x10x10 cm = 1L
    let rockDisplacement = rocks * 1;

    let real = volume - substrateDisplacement - rockDisplacement;
    if (real < 0) real = 0; // Prevent negative volume

    let gallons = real / 3.785;

    document.getElementById("realVolume").innerHTML = `
        <strong>Real Volume:</strong><br>
        ${real.toFixed(1)} Liters<br>
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

function getSpeciesRule(fish) {
    const latin = (fish.latin_name || "").toLowerCase();
    const common = (fish.common_name || "").toLowerCase();

    // default fallback
    let rule = {
        factor: fish.bioload === "low" ? 1
              : fish.bioload === "medium" ? 1.5
              : fish.bioload === "high" ? 2.5
              : 3.5,
        warnings: []
    };

    // shrimp/snails
    if (fish.category === "shrimp") {
        rule.litersPerFish = 0.5; // 2 shrimp = 1L
        rule.factor = 0;
        return rule;
    }

    if (fish.category === "snail") {
        rule.litersPerFish = 1.0;
        rule.factor = 0;
        return rule;
    }

    // clownfish
    if (latin.startsWith("amphiprion") || common.includes("clownfish")) {
        rule.factor = 2.0;
        rule.warnings.push("Clownfish are territorial; keep a pair or a single fish.");
        return rule;
    }

    // tangs / surgeonfish
    if (latin.startsWith("acanthurus") || common.includes("tang") || common.includes("surgeonfish")) {
        rule.factor = 3.0;
        rule.warnings.push("Tang / surgeonfish need lots of swimming room and algae.");
        return rule;
    }

    // cichlids that are usually territorial
    if (
        latin.startsWith("amatitlania") ||
        latin.startsWith("amphilophus") ||
        latin.startsWith("aequidens") ||
        latin.startsWith("altolamprologus") ||
        latin.startsWith("acarichthys") ||
        latin.startsWith("acaronia")
    ) {
        rule.factor = 2.25;
        rule.warnings.push("Cichlid: territorial; pairs or solo often work best.");
        rule.warnings.push("May eat shrimp/snails.");
        return rule;
    }

    // plecos / catfish / bottom dwellers
    if (
        latin.startsWith("acanthicus") ||
        latin.startsWith("acestridium") ||
        common.includes("pleco") ||
        common.includes("catfish")
    ) {
        rule.factor = fish.bioload === "low" ? 1.25 : 2.0;
        rule.warnings.push("Bottom-dweller: needs hides and floor space.");
        return rule;
    }

    // huge species where min_tank matters more than the formula
    if (
        latin.startsWith("huso") ||
        latin.startsWith("acipenser") ||
        common.includes("sturgeon") ||
        common.includes("ray") ||
        common.includes("shark") ||
        common.includes("guitarfish")
    ) {
        rule.factor = 0;
        return rule;
    }

    return rule;
}

function calculate() {

    let tank = getTankLiters();

    // ✅ Tank safety check
    if (!tank || tank <= 0) {
        document.getElementById("capacity").innerHTML = "Enter tank size";
        return;
    }

    let totalBioloadLiters = 0;
    let maxMinTankRequirement = 0;
    let warnings = "";
    let warningSet = new Set();

    let wrongType = false;
    let hardMinTankOnly = false;

    // Track categories
    let shrimpPresent = selectedFish.some(f => f.category === "shrimp");
    let snailPresent = selectedFish.some(f => f.category === "snail");

    // Track activity properly (ONLY valid fish)
    let activityLevels = [];

    // Compatibility tracking
    let predators = [];
    let territorialFish = [];
    let schoolingFish = [];
    let aggressiveFish = [];

    // Temp / PH
    let tempMins = [];
    let tempMaxs = [];
    let phMins = [];
    let phMaxs = [];

    const tankType = document.getElementById("tankType").value;

    selectedFish.forEach(fish => {

        if (fish.type !== tankType) {
            wrongType = true;
            return;
        }

        // ✅ Only valid fish tracked
        activityLevels.push(fish.activity);

        const rule = getSpeciesRule(fish);

        // Track min tank
        if (fish.min_tank && fish.min_tank > maxMinTankRequirement) {
            maxMinTankRequirement = fish.min_tank;
        }

        // ✅ Huge species override detection
        if (rule.factor === 0 && fish.min_tank) {
            hardMinTankOnly = true;
        }

        // --- Bioload ---
        if (fish.category === "shrimp") {
            totalBioloadLiters += fish.amount * rule.litersPerFish;
        } 
        else if (fish.category === "snail") {
            totalBioloadLiters += fish.amount * rule.litersPerFish;
        } 
        else if (rule.factor > 0) {
            if (fish.bioload === "low" && fish.size_cm < 5) {
                totalBioloadLiters += fish.size_cm * fish.amount;
            } else {
                totalBioloadLiters += fish.size_cm * fish.amount * rule.factor;
            }
        }

        // --- Behavior tracking ---
        if (fish.aggression === "predatory") predators.push(fish);
        if (fish.aggression === "territorial" || fish.aggression === "semi-aggressive") territorialFish.push(fish);
        if (fish.schooling) schoolingFish.push(fish);
        if (fish.aggression === "aggressive" || fish.aggression === "predatory") aggressiveFish.push(fish);

        // --- Predator warning ---
        if (fish.aggression === "predatory") {
            let prey = selectedFish.filter(other =>
                fish !== other && fish.size_cm > other.size_cm * 1.5
            );
            if (prey.length) {
                warningSet.add(`<div class="warning">${fish.latin_name} may eat smaller tank mates</div>`);
            }
        }

        // Species warnings
        rule.warnings.forEach(msg => {
            warningSet.add(`<div class="warning">${fish.latin_name}: ${msg}</div>`);
        });

        // Min tank warning
        if (fish.min_tank && tank < fish.min_tank) {
            warningSet.add(`<div class="warning">${fish.latin_name} needs at least ${fish.min_tank}L</div>`);
        }

        // Temperature
        if (fish.temperature) {
            tempMins.push(fish.temperature[0]);
            tempMaxs.push(fish.temperature[1]);
        }

        // PH
        if (fish.ph) {
            phMins.push(fish.ph[0]);
            phMaxs.push(fish.ph[fish.ph.length - 1]);
        }

        // Schooling
        if (fish.schooling && fish.amount < fish.min_school) {
            warningSet.add(`<div class="warning">${fish.latin_name} needs at least ${fish.min_school} fish</div>`);
        }

        // Group limits
        if (fish.max_group === 1) {
            if (fish.amount === 2) {
                warningSet.add(`<div class="warning-yellow">${fish.latin_name} can only be in pairs when breeding</div>`);
            } else if (fish.amount > 2) {
                warningSet.add(`<div class="warning-yellow">${fish.latin_name} cannot be kept in groups</div>`);
            }
        } else if (fish.max_group && fish.amount > fish.max_group) {
            warningSet.add(`<div class="warning-yellow">${fish.latin_name} max group size is ${fish.max_group}</div>`);
        }

        // Shrimp/snail risk
        if (shrimpPresent && fish.eat_shrimp) {
            warningSet.add(`<div class="warning">${fish.latin_name} may eat shrimp!</div>`);
        }
        if (snailPresent && fish.eat_snails) {
            warningSet.add(`<div class="warning">${fish.latin_name} may eat snails!</div>`);
        }

        // Algae requirement
        if (fish.needs_algae && !document.getElementById("planted").checked) {
            warningSet.add(`<div class="warning">${fish.latin_name} needs algae / mature tank</div>`);
        }

    });

    // --- GLOBAL CHECKS ---

    if (wrongType) {
        warningSet.add(`<div class="warning">Some fish are not compatible with tank type</div>`);
    }

    if (territorialFish.length > 1) {
        warningSet.add(`<div class="warning">Multiple territorial species may fight</div>`);
    }

    if (predators.length > 1) {
        warningSet.add(`<div class="warning">Multiple predatory species may compete or kill tank mates</div>`);
    }

    if (schoolingFish.length && aggressiveFish.length) {
        warningSet.add(`<div class="warning">Schooling fish may be stressed by aggressive tank mates</div>`);
    }

    if (tank < 20 && selectedFish.length > 3) {
        warningSet.add(`<div class="warning">Small tanks are unstable; limit species variety</div>`);
    }

    if (selectedFish.length === 1) {
        warningSet.add(`<div class="warning-yellow">Single-species tank — consider compatible tank mates</div>`);
    }

    // --- ENERGY CHECK ---
    if (activityLevels.length > 1) {
        let values = activityLevels.map(a => a === "low" ? 1 : a === "high" ? 3 : 2);
        let diff = Math.max(...values) - Math.min(...values);
        if (diff >= 2) {
            warningSet.add(`<div class="warning">High and low energy fish detected</div>`);
        }
    }

    // --- TEMP ---
    let tempText = "";
    if (tempMins.length) {
        let minTemp = Math.max(...tempMins);
        let maxTemp = Math.min(...tempMaxs);
        tempText = (minTemp <= maxTemp)
            ? `Temperature: ${minTemp}°C - ${maxTemp}°C`
            : `<div class="warning">No temperature overlap</div>`;
    }

    // --- PH ---
    let phText = "";
    if (phMins.length) {
        let minPh = Math.max(...phMins);
        let maxPh = Math.min(...phMaxs);
        phText = (minPh <= maxPh)
            ? `PH: ${minPh} - ${maxPh}`
            : `<div class="warning">No PH overlap</div>`;
    }

    // --- FINAL CAPACITY ---
    let percent = (totalBioloadLiters / tank) * 100;

    let requiredLiters = hardMinTankOnly
        ? maxMinTankRequirement
        : Math.max(totalBioloadLiters, maxMinTankRequirement);

    let capacityEl = document.getElementById("capacity");

    if (percent > 100 || tank < maxMinTankRequirement) {
        capacityEl.classList.add("overstock");

        let requiredGallons = requiredLiters / 3.785;
        let reason = (tank < maxMinTankRequirement)
            ? " (Tank too small for species)"
            : " (Overcrowded)";

        capacityEl.innerHTML = `
            Capacity: ${percent.toFixed(1)}% ${reason}
            <br>
            You will need at least ${requiredLiters.toFixed(1)} L / ${requiredGallons.toFixed(1)} Gal
        `;
    } else {
        capacityEl.classList.remove("overstock");
        capacityEl.innerHTML = `Capacity: ${percent.toFixed(1)}%`;
    }

    // --- OUTPUT ---
    document.getElementById("temperatureRange").innerHTML = tempText;
    document.getElementById("phRange").innerHTML = phText;
    document.getElementById("warnings").innerHTML = Array.from(warningSet).join("");
}

function reloadTankType(){
    updateCategoryButtons();
    updateList();
    calculate();

    // re-filter list so hidden categories disappear
    const query = document.getElementById("fishInput").value.toLowerCase();
    filterFish(query);
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

function convertMini() {
    let value = parseFloat(document.getElementById("convertValue").value);
    let from = document.getElementById("convertFrom").value;
    let resEl = document.getElementById("convertResult");

    if (isNaN(value) || value <= 0) {
        resEl.innerHTML = "Enter a value";
        return;
    }

    let result;
    if (from === "liters") {
        result = value / 3.785;
        resEl.innerHTML = result.toFixed(2) + " Gallons";
    } else {
        result = value * 3.785;
        resEl.innerHTML = result.toFixed(2) + " Liters";
    }
}

function checkEmojiSupport() {
    const coralBtn = document.getElementById("btn-corals");
    if (!coralBtn) return;

    const coralEmoji = "🪸"; // The emoji to test
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 20;
    canvas.height = 20;

    ctx.fillStyle = "#000";
    ctx.textBaseline = "top";
    ctx.font = "16px Arial";
    ctx.fillText(coralEmoji, 0, 0);

    // Get pixel data from the canvas
    const pixels = ctx.getImageData(0, 0, 20, 20).data;
    
    // Check if any pixels were actually colored (not black/transparent)
    // If the emoji isn't supported, it usually draws nothing or a thin empty box
    let supported = false;
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] !== 0 || pixels[i+1] !== 0 || pixels[i+2] !== 0) {
            supported = true;
            break;
        }
    }

    if (!supported) {
        coralBtn.innerText = "🏝️"; // Fallback to Island
    }
}

function calculateTankFromDimensions() {
    let l = parseFloat(document.getElementById("dimLength").value) || 0;
    let w = parseFloat(document.getElementById("dimWidth").value) || 0;
    let h = parseFloat(document.getElementById("dimHeight").value) || 0;
    let unit = document.getElementById("dimUnit").value;
    let resEl = document.getElementById("dimResult");

    if(l <=0 || w <=0 || h <=0){
        resEl.innerHTML = "Enter all dimensions!";
        return;
    }

    // Convert to cm if inch
    if(unit === "inch"){
        l *= 2.54;
        w *= 2.54;
        h *= 2.54;
    }

    // Volume in liters
    let volumeLiters = (l * w * h) / 1000;
    let volumeGallons = volumeLiters / 3.785;

    resEl.innerHTML = `${volumeLiters.toFixed(1)} L / ${volumeGallons.toFixed(1)} Gal`;

    // Optional: update Tank Size field automatically
    let tankUnit = document.getElementById("unit").value;
    document.getElementById("tankSize").value = tankUnit === "liters" ? volumeLiters.toFixed(1) : volumeGallons.toFixed(1);

    calculate(); // recalc capacity with new tank size
}