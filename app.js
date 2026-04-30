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
    loadState();
});

const linkedSpecies = {
    "corydoras": ["corydoras", "hoplisoma", "aspidoras", "gastrodermus"],
    "hoplisoma": ["corydoras", "hoplisoma", "aspidoras", "gastrodermus"],
    "aspidoras": ["corydoras", "hoplisoma", "aspidoras", "gastrodermus"],
    "gastrodermus": ["corydoras", "hoplisoma", "aspidoras", "gastrodermus"],
    "nassarius": ["nassarius", "tritia"],
    "tritia": ["nassarius", "tritia"],
    "nanochromis": ["nanochromis", "distichodus"],
};

const genusLinks = {
    "corydoras": "hoplisoma",
    "hoplisoma": "corydoras",
    "aspidoras": "corydoras",
    "gastrodermus": "corydoras",
    "nassarius": "tritia",
    "tritia": "nassarius",
    "nanochromis": "distichodus"
};

const commonSynonyms = {
    "rockcod": "grouper",
    "grouper": "rockcod",
    "siamese algae eater": "sae",
    "cherry shrimp": "neocaridina",
    "nassarius": "tritia",
    "tritia": "nassarius",
    "nanochromis": "distichodus"
};

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

    document.getElementById("hasSand").addEventListener("change", calculate);

    // Inputs that allow 0+
    [
        "tankSize",
        "convertValue",
        "tankVolumeInput",
        "substrate",
        "rocks"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) preventNegativeInput(el, 0);
    });

    // Inputs that must be ≥ 1
    [
        "length",
        "width",
        "height",
        "dimLength",
        "dimWidth",
        "dimHeight"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) preventNegativeInput(el, 1);
    });
    
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
    saveState();
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
    query = query.toLowerCase().trim();

    // 1. Find potential synonyms based on partial typing
    let activeSynonyms = [];
    if (query.length > 0) {
        Object.entries(commonSynonyms).forEach(([key, value]) => {
            // If user types "rockc", and "rockcod" starts with "rockc"
            // we add "grouper" to the search terms.
            if (key.startsWith(query)) activeSynonyms.push(value);
            if (value.startsWith(query)) activeSynonyms.push(key);
        });
    }

    const filtered = fishDB.filter(fish => {
        const latin = fish.latin_name.toLowerCase();
        const common = (fish.common_name || "").toLowerCase();
        const category = fish.category || "fish";

        if (!activeCategories[category]) return false;

        // Logic A: Normal text match (Does name contain "rockc"?)
        const words = query.split(/\s+/);
        let match = words.every(w => latin.includes(w) || common.includes(w));

        // Logic B: Partial Synonym match (If typing "rockc", find fish containing "grouper")
        if (!match && activeSynonyms.length > 0) {
            match = activeSynonyms.some(syn => latin.includes(syn) || common.includes(syn));
        }

        // Logic C: Genus-links (e.g., Corydoras / Hoplisoma)
        if (!match && words.length > 1) {
            let genus = words[0]; 
            let species = words.slice(1).join(" "); 
            if (genusLinks[genus]) {
                const linkedLatin = genusLinks[genus] + " " + species;
                match = latin.includes(linkedLatin);
            }
        }

        return match;
    });

    renderSelectOptions(filtered);

    if (filtered.length > 0) {
        document.getElementById("fishSelect").selectedIndex = 0;
    }
}

function renderSelectOptions(fishArray) {
    const select = document.getElementById("fishSelect");
    select.innerHTML = ""; 

    // 1. Create a unique list based on latin_name to prevent duplicates
    const uniqueFish = [];
    const seenNames = new Set();

    fishArray.forEach(fish => {
        const name = fish.latin_name.toLowerCase().trim();
        if (!seenNames.has(name)) {
            seenNames.add(name);
            uniqueFish.push(fish);
        }
    });

    // 2. Sort the unique list
    const sorted = [...uniqueFish].sort((a, b) => a.latin_name.localeCompare(b.latin_name));

    // 3. Render
    sorted.forEach(fish => {
        // Find the original index in the main fishDB for adding logic
        let originalIndex = fishDB.findIndex(f => f.latin_name === fish.latin_name);
        
        let option = document.createElement("option");
        option.value = originalIndex;
        option.text = `${fish.latin_name} (${fish.common_name || "Unknown"})`;
        
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

function removeFish(index) {
    const inputEl = document.getElementById(`removeInput-${index}`);
    let removeAmount = parseInt(inputEl.value) || 0;

    if (removeAmount < 0) removeAmount = 0; // prevent negative numbers

    if (removeAmount >= selectedFish[index].amount) {
        // Remove the fish entirely
        selectedFish.splice(index, 1);
    } else {
        // Subtract from the fixed stock
        selectedFish[index].amount -= removeAmount;
    }

    // Reset the input box to 0
    if(inputEl) inputEl.value = 0;

    updateList();
    calculate();
}

function removeAllFish(index) {
    const fishName = selectedFish[index].latin_name;

    if (confirm(`Remove ALL ${fishName}?`)) {
        selectedFish.splice(index, 1);
        updateList();
        calculate();
    }
}

function addMoreFish(index) {
    const inputEl = document.getElementById(`addInput-${index}`);
    let addAmount = parseInt(inputEl.value) || 0;

    if (addAmount > 0) {
        selectedFish[index].amount += addAmount;
        inputEl.value = 0; // Reset input to 0
        updateList();
        calculate();
    }
}

function updateList() {
    const list = document.getElementById("fishList");
    list.innerHTML = "";

    selectedFish.forEach((fish, i) => {
        let invalid = "";
        const tankType = document.getElementById("tankType").value;

        // Compatibility rules
        const isSoftCompatible =
            (fish.type === "freshwater" && tankType === "brackish") ||
            (fish.type === "brackish" && tankType === "freshwater");

        const isHardIncompatible =
            (fish.type === "marine" && tankType !== "marine") ||
            (tankType === "marine" && fish.type !== "marine");

        if (isHardIncompatible) {
            invalid = "invalid"; // RED
        } else if (isSoftCompatible) {
            invalid = "warning-yellow"; // YELLOW
        }

        const li = document.createElement("li");
        li.style.marginBottom = "10px"; // Spacing between fish rows

        li.innerHTML = `
            <span class="${invalid}" title="${invalid === 'warning-yellow' ? 'Can adapt but not ideal' : ''}">
                ${fish.latin_name}
            </span>
            <span style="margin-left:10px; font-weight:bold; font-size: 1.1em;">${fish.amount}</span>

            <!-- Remove Controls -->
            <input type="number" value="0" min="0" style="width:50px; margin-left:15px;" id="removeInput-${i}">
            <button onclick="removeFish(${i})" style="margin-left:5px; background:#b67474; color:white; border:none; border-radius:4px;">Remove</button>
            
            <!-- Add Controls -->
            <input type="number" value="0" min="0" style="width:50px; margin-left:15px;" id="addInput-${i}">
            <button onclick="addMoreFish(${i})" style="margin-left:5px; background:#27ae60; color:white; border:none; border-radius:4px;">Add</button>

            <!-- Remove All -->
            <button onclick="removeAllFish(${i})" style="margin-left:15px; background:#ff6b6b; color:white; border:none; border-radius:4px;">Remove All</button>

            <br>
            <small>Energy: ${fish.activity} | Aggression: ${fish.aggression}</small>
        `;

        list.appendChild(li);

        // Apply restrictions to both inputs (Remove and Add)
        [ `removeInput-${i}`, `addInput-${i}` ].forEach(id => {
            const inputEl = document.getElementById(id);
            inputEl.addEventListener("keydown", (e) => {
                if (["Backspace","Delete","Tab","Escape","Enter","ArrowLeft","ArrowRight"].includes(e.key)) return;
                if (e.key === "-" || isNaN(Number(e.key))) e.preventDefault();
            });
            inputEl.addEventListener("input", () => {
                inputEl.value = inputEl.value.replace(/[^0-9]/g, "");
            });
        });
    });
    saveState();
}

function getSpeciesRule(fish) {
    const latin = (fish.latin_name || "").toLowerCase();
    const common = (fish.common_name || "").toLowerCase();

    // Default base rule
    let rule = {
        factor: fish.bioload === "low" ? 1
              : fish.bioload === "medium" ? 1.5
              : fish.bioload === "high" ? 2.5
              : 3.5,
        warnings: [],
        territoryLiters: fish.territorial ? fish.territory_volume_liters || 0 : 0,
        predatory: fish.predatory || false,
        minSchool: fish.min_school || 1,
        maxGroup: fish.max_group || Infinity,
        plantSafe: fish.plant_safe || false,
        needsAlgae: fish.needs_algae || false,
        activity: fish.activity || "medium",
        minTank: fish.min_tank || 0
    };

    // Shrimp/snail overrides
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

    // Clownfish
    if (latin.startsWith("amphiprion") || common.includes("clownfish")) {
        rule.factor = 2.0;
        rule.warnings.push("Clownfish are territorial; keep a pair or single fish.");
        rule.territoryLiters = fish.territory_volume_liters || 30;
    }

    // Tangs / Surgeonfish
    if (latin.startsWith("acanthurus") || common.includes("tang") || common.includes("surgeonfish")) {
        rule.factor = 3.0;
        rule.warnings.push("Tang / surgeonfish need lots of swimming room and algae.");
        rule.territoryLiters = fish.territory_volume_liters || 100;
    }

    // Cichlids (territorial)
    const cichlids = ["amatitlania","amphilophus","aequidens","altolamprologus","acarichthys","acaronia"];
    if (cichlids.some(c => latin.startsWith(c))) {
        rule.factor = 2.25;
        rule.warnings.push("Cichlid: territorial; pairs or solo often work best.");
        rule.warnings.push("May eat shrimp/snails.");
        rule.territoryLiters = fish.territory_volume_liters || 50;
    }

    // Bottom-dwellers
    if (fish.category === "fish" && fish.tank_position === "bottom") {
        rule.factor = fish.bioload === "low" ? 1.25 : 2.0;

        const planted = document.getElementById("planted").checked;
        const sand = document.getElementById("hasSand").checked;

        if (planted && !sand) {
            rule.warnings.push("Bottom-dweller: needs sand to sift.");
        } 
        else if (!planted && sand) {
            rule.warnings.push("Bottom-dweller: needs hiding spaces.");
        } 
        else if (!planted && !sand) {
            rule.warnings.push("Bottom-dweller: needs hides and floor space.");
        }
        // if both are checked → no warning (ideal setup)

        rule.territoryLiters = fish.territory_volume_liters || 20;
    }

    // Huge species where min_tank dominates
    const hugeSpecies = ["huso","acipenser"];
    if (hugeSpecies.some(h => latin.startsWith(h)) || common.includes("sturgeon") || common.includes("ray") || common.includes("shark") || common.includes("guitarfish")) {
        rule.factor = 0;
        rule.isHuge = true; // flag for special handling
        rule.territoryLiters = fish.min_tank || 200;
    }

    // Predatory behavior
    if (fish.predatory && selectedFish.length > 1) {
        rule.warnings.push("Predatory: may eat smaller tank mates.");
    }

    // Schooling rules
    if (fish.schooling && fish.amount < fish.min_school) {
        rule.warnings.push(`Schooling fish: needs at least ${fish.min_school} individuals.`);
    }

    // Territorial warning if user may under-stock tank
    if (fish.territorial && !fish.min_tank) {
        rule.warnings.push("Territorial: ensure enough space per individual.");
    }

    // Plant-safe warning
    if (!fish.plant_safe) {
        if (!document.getElementById("planted").checked) {
            // no warning
        } else {
            rule.warnings.push(`<div class="warning-yellow">${fish.latin_name} may damage plants (depends on setup)</div>`);
        }
    }

    // Algae / mature tank warning
    if (fish.needs_algae) {
        rule.warnings.push("Needs algae or mature tank.");
    }

    // Default litersPerFish if not set
    if (!rule.litersPerFish) {
        rule.litersPerFish = fish.size_cm * rule.factor;
    }

    return rule;
}

function calculate() {
    console.log("CALULATING...");

    let tank = getTankLiters();

    // Tank safety check
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

    let tankMultiplier = 1.0;
    let territoryFactor = 1;

    const tankType = document.getElementById("tankType").value;

    
    let userLevel = document.getElementById("userLevel").value;

    
    console.log("Tank:", tank);
    console.log("Bioload:", totalBioloadLiters);
    console.log("Multiplier:", tankMultiplier);

    if (userLevel === "expert") {
        tankMultiplier *= 1.3;
        territoryFactor *= 0.7;
    }

    if (userLevel === "beginner") {
        tankMultiplier *= 0.8;
    }

    // Filtration bonus
    let filtrationLevel = "high"; // later make UI
    if (filtrationLevel === "high") tankMultiplier *= 1.25;
    if (filtrationLevel === "extreme") tankMultiplier *= 1.5;

    // Planted bonus
    if (document.getElementById("planted").checked) {
        tankMultiplier *= 1.2;
    }

    // Hardscape bonus (NEW idea)
    let hardscapeLevel = "high"; // later UI
    if (hardscapeLevel === "high") tankMultiplier *= 1.15;

    selectedFish.forEach(fish => {

        // --- GROWTH PROJECTION ---
        let monthsAhead = 6; // or make this a UI input later

        let projectedSize = fish.current_size_cm 
            ? fish.current_size_cm + (fish.growth_rate_cm_per_month || 0) * monthsAhead
            : fish.size_cm;

        let size = Math.min(projectedSize, fish.max_size_cm || fish.size_cm);

        const compatible =
            fish.type === tankType ||
            (fish.type === "freshwater" && tankType === "brackish") ||
            (fish.type === "brackish" && tankType === "freshwater");

        if (!compatible) {
            wrongType = true;
            return;
        }

        // Only valid fish tracked
        activityLevels.push(fish.activity);

        const rule = getSpeciesRule(fish);

        // Track min tank
        if (fish.min_tank && fish.min_tank > maxMinTankRequirement) {
            maxMinTankRequirement = fish.min_tank;
        }

        // Huge species override detection
        if (rule.factor === 0 && fish.min_tank) {
            hardMinTankOnly = true;
        }

        // --- Bioload ---
        if (fish.category === "shrimp") {
            totalBioloadLiters += fish.amount * rule.litersPerFish;
        } 
        else if (fish.category === "snail") {
            totalBioloadLiters += fish.amount * rule.litersPerFish;
        } else {
            let waste = fish.waste_factor || 1;

            if (rule.isHuge) {
                // For huge species, use minimum tank as bioload baseline
                totalBioloadLiters += fish.min_tank * fish.amount;
            } else {
                totalBioloadLiters += size * fish.amount * rule.factor * waste;
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

        // Show HUGE warning ONLY if tank too small
        if (rule.isHuge && tank < fish.min_tank) {
            warningSet.add(`<div class="warning">${fish.latin_name}: Tank too small for this species</div>`);
        }

        // Min tank warning
        if (fish.min_tank && tank < fish.min_tank) {
            warningSet.add(`<div class="warning">${fish.latin_name} needs at least ${fish.min_tank}L</div>`);
        }

        // Warn if user exceeds the max group
        if(fish.max_group && fish.amount > fish.max_group){
            warningSet.add(`<div class="warning-yellow">${fish.latin_name} max group size is ${fish.max_group}</div>`);
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

    // --- TERRITORIAL CHECK ---
    let territorialVolumeRequired = territorialFish.reduce((sum, f) => {
        const rule = getSpeciesRule(f);
        return sum + (rule.territoryLiters || 0) * f.amount;
    }, 0);

    if (document.getElementById("planted").checked) {
        territoryFactor *= 0.7; // plants reduce aggression
    }

    if (hardscapeLevel === "high") {
        territoryFactor *= 0.6; // caves reduce conflict
    }

    // (optional) user skill adjustment
    userLevel = document.getElementById("userLevel").value;
    if (userLevel === "expert") territoryFactor *= 0.7;
    if (userLevel === "beginner") territoryFactor *= 1.2;

    // Apply adjustment
    let adjustedTerritory = territorialVolumeRequired * territoryFactor;

    // Final check
    if (territorialFish.length > 1 && tank < adjustedTerritory) {
        warningSet.add(
            `<div class="warning">
            Tank may be too small for multiple territorial species 
            (adjusted need: ${adjustedTerritory.toFixed(1)} L)
            </div>`
        );
    }

    // --- CONSPECIFIC TERRITORIAL AGGRESSION ---
    territorialFish.forEach(f => {
        if (f.amount > 1 && f.territorial) {
            warningSet.add(`<div class="warning">${f.latin_name} may fight conspecifics</div>`);
        }
    });

    // --- SCHOOLING vs TERRITORIAL ---
    schoolingFish.forEach(s => {
        territorialFish.forEach(t => {
            const tRule = getSpeciesRule(t);
            if (tRule.territoryLiters && tank < tRule.territoryLiters) {
                warningSet.add(`<div class="warning">${s.latin_name} (schooling) may be stressed by territorial ${t.latin_name}</div>`);
            }
        });
    });

    // --- PREDATORS ---
    predators.forEach(p => {
        selectedFish.forEach(other => {
            if(p !== other && p.size_cm > other.size_cm * 1.5){
                warningSet.add(`<div class="warning">${p.latin_name} may eat ${other.latin_name}</div>`);
            }
        });
    });

    // --- OXYGEN NEEDS ---
    let oxygenNeeds = [];

    selectedFish.forEach(f => {
        if(f.oxygen_requirement_mg_per_l){
            oxygenNeeds.push(f.oxygen_requirement_mg_per_l);
        }
    });

    if(oxygenNeeds.length){
        let maxOxygen = Math.max(...oxygenNeeds);

        if(maxOxygen > 7 && tank > 25){
            warningSet.add(`<div class="warning">High oxygen-demand species present — requires strong aeration</div>`);
        }
    }

    // --- FLOW REQUIREMENTS ---
    let flows = selectedFish.map(f => f.flow_requirement).filter(Boolean);

    if(flows.length > 1){
        let unique = [...new Set(flows)];
        if(unique.length > 1){
            warningSet.add(`<div class="warning">Flow requirement mismatch (low vs high flow species)</div>`);
        }
    }

    // --- TANK POSITIONING ---
    let positions = {top:0, middle:0, bottom:0};

    selectedFish.forEach(f => {
        if(positions[f.tank_position] !== undefined){
            positions[f.tank_position] += f.amount;
        }
    });

    let bottomLimit = Math.max(8, tank / 10); 

    if(positions.bottom > bottomLimit){
        warningSet.add(`<div class="warning">High density of bottom-dwellers (${positions.bottom}) — ensure enough floor space/hides.</div>`);
    }

    // --- FISH DIETS ---
    let diets = selectedFish.map(f => f.diet).filter(Boolean);
    let uniqueDiets = [...new Set(diets)];

    if(uniqueDiets.length > 2){
        warningSet.add(`<div class="warning">Mixed diets may complicate feeding</div>`);
    }

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
    let effectiveTank = tank * tankMultiplier;
    let percent = (totalBioloadLiters / effectiveTank) * 100;

    /*let requiredLiters = hardMinTankOnly
        ? maxMinTankRequirement
        : Math.max(totalBioloadLiters, maxMinTankRequirement);
    */
    let requiredLiters = Math.max(totalBioloadLiters, maxMinTankRequirement);

    let capacityEl = document.getElementById("capacity");
    console.log("capacityEl:", capacityEl);

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

    // Auto-save when user level changes
    document.getElementById("userLevel").addEventListener("change", calculate);

    // Auto-save when planted status changes
    document.getElementById("planted").addEventListener("change", calculate);

    saveState();
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
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;

    // Helper to convert Image URL to Base64
    const getBase64Image = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.onerror = (err) => reject(err);
        });
    };

    // --- TITLE ---
    doc.setFontSize(22);
    doc.setTextColor(30, 144, 255);
    doc.text("Tank Stocking Report", 20, y);
    y += 15;

    // --- FISH LIST ---
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    for (const fish of selectedFish) {
        if (y > 250) { // Safety margin for page break
            doc.addPage();
            y = 20;
        }

        if (fish.photo) {
            try {
                const imgData = await getBase64Image(fish.photo);
                doc.addImage(imgData, 'JPEG', 20, y, 30, 20);
            } catch (e) { console.error("PDF Image Error", e); }
        }

        doc.setFont("helvetica", "bold");
        doc.text(`${fish.latin_name}`, 55, y + 7);
        doc.setFont("helvetica", "italic");
        doc.text(`(${fish.common_name || "Unknown"})`, 55, y + 13);
        doc.setFont("helvetica", "normal");
        doc.text(`Quantity: ${fish.amount}`, 55, y + 19);
        y += 30;
    }

    // --- TANK SPECIFICATIONS SECTION ---
    y += 10;
    if (y > 230) { doc.addPage(); y = 20; } // Check for space

    doc.setDrawColor(30, 144, 255);
    doc.line(20, y, 190, y);
    y += 12;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Tank Specifications:", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    // Gather data from your inputs
    const tankSizeVal = document.getElementById("tankSize").value;
    const tankUnit = document.getElementById("unit").value;
    const userLevel = document.getElementById("userLevel").value;
    const tankType = document.getElementById("tankType").value;
    const isPlanted = document.getElementById("planted").checked ? "Planted" : "Not Planted";

    // Format the strings
    const specLines = [
        `System Size: ${tankSizeVal} ${tankUnit.charAt(0).toUpperCase() + tankUnit.slice(1)}`,
        `Aquarist Mode: ${userLevel.charAt(0).toUpperCase() + userLevel.slice(1)} Aquarist`,
        `Environment: ${tankType.charAt(0).toUpperCase() + tankType.slice(1)} Setup`,
        `Decoration: ${isPlanted}`
    ];

    specLines.forEach(line => {
        doc.text(line, 20, y);
        y += 7;
    });

    // --- CALCULATED RESULTS ---
    y += 5;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Estimated Compatibility:", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const capText = document.getElementById("capacity").innerText.replace(/\n/g, ' ');
    const tempText = document.getElementById("temperatureRange").innerText;
    const phText = document.getElementById("phRange").innerText;

    doc.text(capText, 20, y);
    y += 7;
    doc.text(tempText, 20, y);
    y += 7;
    doc.text(phText, 20, y);

    // Final Footer Note
    y += 15;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Note: This is an automated estimate. Always research specific species compatibility.", 20, y);

    doc.save("Aquarium_Stocking_Report.pdf");
}

// Function to save current data to Local Storage
function saveState() {
    const state = {
        selectedFish: selectedFish,
        activeCategories: activeCategories,
        userLevel: document.getElementById("userLevel").value,
        tankSize: document.getElementById("tankSize").value,
        unit: document.getElementById("unit").value,
        tankType: document.getElementById("tankType").value,
        planted: document.getElementById("planted").checked
    };
    localStorage.setItem("aquariumCalcState", JSON.stringify(state));
}

// Function to load data when page opens
function loadState() {
    const saved = localStorage.getItem("aquariumCalcState");
    if (!saved) return;

    const state = JSON.parse(saved);

    // Restore variables
    selectedFish = state.selectedFish || [];
    activeCategories = state.activeCategories || activeCategories;

    // Restore UI elements
    document.getElementById("userLevel").value = state.userLevel || "beginner";
    document.getElementById("tankSize").value = state.tankSize || "100";
    document.getElementById("unit").value = state.unit || "liters";
    document.getElementById("tankType").value = state.tankType || "freshwater";
    document.getElementById("planted").checked = state.planted || false;

    // Refresh the category button visuals (active vs inactive)
    Object.keys(activeCategories).forEach(cat => {
        const btn = document.querySelector(`[onclick="toggleCategory('${cat}')"]`);
        if (btn) {
            btn.classList.toggle("inactive", !activeCategories[cat]);
        }
    });

    // Final UI refresh
    updateList();
    calculate();
    updateCategoryButtons();
}

function preventNegativeInput(input, minValue = 0) {

    // Block invalid key presses
    input.addEventListener("keydown", (e) => {
        const blockedKeys = ["-", "+", "e", "E"];

        if (blockedKeys.includes(e.key)) {
            e.preventDefault();
        }
    });

    // Clean input (handles paste, drag, etc.)
    input.addEventListener("input", () => {
        let value = input.value;

        // Remove anything that is not a number or dot
        value = value.replace(/[^0-9.]/g, "");

        // Prevent multiple dots
        const parts = value.split(".");
        if (parts.length > 2) {
            value = parts[0] + "." + parts.slice(1).join("");
        }

        // Convert to number and enforce minimum
        let num = parseFloat(value);

        if (!isNaN(num)) {
            if (num < minValue) num = minValue;
            input.value = num;
        } else {
            input.value = "";
        }
    });
}

function toggleVolumeMode() {
    const mode = document.getElementById("volumeMode").value;

    const litersDiv = document.getElementById("volumeLiters");
    const dimensionsDiv = document.getElementById("volumeDimensions");

    if (mode === "liters") {
        litersDiv.style.display = "block";
        dimensionsDiv.style.display = "none";
    } else {
        litersDiv.style.display = "none";
        dimensionsDiv.style.display = "block";
    }
}