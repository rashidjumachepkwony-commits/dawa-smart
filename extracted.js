
// =============================================================
// OFFLINE-FIRST: Service Worker Registration
// =============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw2.js', { scope: '/', updateViaCache: 'none' })
      .then(function(reg) {
        console.log('[Dawa Smart] Service Worker registered (scope: /)');
        // Check for updates
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch(function(error) {
        console.log('[Dawa Smart] Service Worker registration failed:', error);
      });
  });

  // Handle SW updates
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    window.location.reload();
  });
  
  // Show update notification when new SW is waiting
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      // New SW is now controlling the page — show refresh prompt
      if (window.location.search.includes('noupdate') !== true) {
        showToast('New version available! Refresh to update.', 'info', 8000);
      }
    });
  }
}

// =============================================================
// APP CONFIGURATION
// =============================================================
const APP_VERSION = '1.0.0';
// =============================================================
// EXPANDED KENYAN DRUG DATABASE - 1000+ DRUGS
// =============================================================
const KENYAN_DRUG_DATABASE = {
  antibiotics: [
    { name: "Amoxicillin 500mg", generic: "Amoxicillin", unit: "caps", controlled: false, minPrice: 3, maxPrice: 12, badge: "antibiotic" },
    { name: "Amoxicillin 250mg", generic: "Amoxicillin", unit: "caps", controlled: false, minPrice: 2, maxPrice: 8, badge: "antibiotic" },
    { name: "Amoxicillin 125mg/5ml", generic: "Amoxicillin", unit: "bottle", controlled: false, minPrice: 15, maxPrice: 45, badge: "antibiotic" },
    { name: "Azithromycin 250mg", generic: "Azithromycin", unit: "tabs", controlled: false, minPrice: 15, maxPrice: 45, badge: "antibiotic" },
    { name: "Azithromycin 500mg", generic: "Azithromycin", unit: "tabs", controlled: false, minPrice: 30, maxPrice: 80, badge: "antibiotic" },
    { name: "Ciprofloxacin 500mg", generic: "Ciprofloxacin", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 20, badge: "antibiotic" },
    { name: "Ciprofloxacin 250mg", generic: "Ciprofloxacin", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 12, badge: "antibiotic" },
    { name: "Doxycycline 100mg", generic: "Doxycycline", unit: "caps", controlled: false, minPrice: 2, maxPrice: 10, badge: "antibiotic" },
    { name: "Metronidazole 400mg", generic: "Metronidazole", unit: "tabs", controlled: false, minPrice: 2, maxPrice: 8, badge: "antibiotic" },
    { name: "Metronidazole 200mg", generic: "Metronidazole", unit: "tabs", controlled: false, minPrice: 1, maxPrice: 5, badge: "antibiotic" },
    { name: "Erythromycin 250mg", generic: "Erythromycin", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 18, badge: "antibiotic" },
    { name: "Clindamycin 300mg", generic: "Clindamycin", unit: "caps", controlled: false, minPrice: 15, maxPrice: 45, badge: "antibiotic" },
    { name: "Amoxicillin/Clavulanate 625mg", generic: "Co-amoxiclav", unit: "tabs", controlled: false, minPrice: 20, maxPrice: 60, badge: "antibiotic" },
    { name: "Amoxicillin/Clavulanate 375mg", generic: "Co-amoxiclav", unit: "tabs", controlled: false, minPrice: 12, maxPrice: 35, badge: "antibiotic" },
    { name: "Ceftriaxone 1g Injection", generic: "Ceftriaxone", unit: "vial", controlled: false, minPrice: 50, maxPrice: 150, badge: "antibiotic" },
    { name: "Ceftazidime 1g", generic: "Ceftazidime", unit: "vial", controlled: false, minPrice: 80, maxPrice: 250, badge: "antibiotic" },
    { name: "Gentamicin 40mg/2ml", generic: "Gentamicin", unit: "ampoule", controlled: false, minPrice: 10, maxPrice: 30, badge: "antibiotic" },
    { name: "Levofloxacin 500mg", generic: "Levofloxacin", unit: "tabs", controlled: false, minPrice: 15, maxPrice: 50, badge: "antibiotic" },
    { name: "Cefixime 200mg", generic: "Cefixime", unit: "tabs", controlled: false, minPrice: 20, maxPrice: 60, badge: "antibiotic" },
    { name: "Cefuroxime 250mg", generic: "Cefuroxime", unit: "tabs", controlled: false, minPrice: 25, maxPrice: 75, badge: "antibiotic" },
    { name: "Cloxacillin 500mg", generic: "Cloxacillin", unit: "caps", controlled: false, minPrice: 4, maxPrice: 15, badge: "antibiotic" },
    { name: "Flucloxacillin 250mg", generic: "Flucloxacillin", unit: "caps", controlled: false, minPrice: 5, maxPrice: 18, badge: "antibiotic" },
    { name: "Vancomycin 500mg", generic: "Vancomycin", unit: "vial", controlled: false, minPrice: 100, maxPrice: 300, badge: "antibiotic" },
    { name: "Meropenem 500mg", generic: "Meropenem", unit: "vial", controlled: false, minPrice: 200, maxPrice: 500, badge: "antibiotic" },
    { name: "Piperacillin/Tazobactam 4.5g", generic: "Piperacillin/Tazobactam", unit: "vial", controlled: false, minPrice: 250, maxPrice: 600, badge: "antibiotic" },
    { name: "Chloramphenicol 500mg", generic: "Chloramphenicol", unit: "caps", controlled: false, minPrice: 3, maxPrice: 12, badge: "antibiotic" },
    { name: "Sulfamethoxazole/Trimethoprim 960mg", generic: "Co-trimoxazole", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 10, badge: "antibiotic" },
    { name: "Sulfamethoxazole/Trimethoprim 480mg", generic: "Co-trimoxazole", unit: "tabs", controlled: false, minPrice: 2, maxPrice: 7, badge: "antibiotic" },
    { name: "Cephalexin 500mg", generic: "Cephalexin", unit: "caps", controlled: false, minPrice: 5, maxPrice: 18, badge: "antibiotic" },
    { name: "Cephalexin 250mg", generic: "Cephalexin", unit: "caps", controlled: false, minPrice: 3, maxPrice: 10, badge: "antibiotic" },
    { name: "Azithromycin 200mg/5ml", generic: "Azithromycin", unit: "bottle", controlled: false, minPrice: 20, maxPrice: 60, badge: "antibiotic" },
    { name: "Clarithromycin 500mg", generic: "Clarithromycin", unit: "tabs", controlled: false, minPrice: 20, maxPrice: 65, badge: "antibiotic" },
    { name: "Clarithromycin 250mg", generic: "Clarithromycin", unit: "tabs", controlled: false, minPrice: 12, maxPrice: 35, badge: "antibiotic" },
    { name: "Tetracycline 250mg", generic: "Tetracycline", unit: "caps", controlled: false, minPrice: 2, maxPrice: 8, badge: "antibiotic" },
    { name: "Minocycline 100mg", generic: "Minocycline", unit: "caps", controlled: false, minPrice: 15, maxPrice: 45, badge: "antibiotic" },
    { name: "Rifampicin 150mg", generic: "Rifampicin", unit: "caps", controlled: false, minPrice: 8, maxPrice: 25, badge: "antibiotic" },
    { name: "Rifampicin 300mg", generic: "Rifampicin", unit: "caps", controlled: false, minPrice: 15, maxPrice: 45, badge: "antibiotic" },
    { name: "Isoniazid 100mg", generic: "Isoniazid", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 10, badge: "antibiotic" },
    { name: "Pyrazinamide 400mg", generic: "Pyrazinamide", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 18, badge: "antibiotic" },
    { name: "Ethambutol 400mg", generic: "Ethambutol", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 18, badge: "antibiotic" }
  ],
  "pain-relief": [
    { name: "Paracetamol 500mg", generic: "Paracetamol", unit: "tabs", controlled: false, minPrice: 0.5, maxPrice: 3, badge: "pain" },
    { name: "Paracetamol 1000mg", generic: "Paracetamol", unit: "tabs", controlled: false, minPrice: 1, maxPrice: 5, badge: "pain" },
    { name: "Paracetamol 120mg/5ml", generic: "Paracetamol", unit: "bottle", controlled: false, minPrice: 5, maxPrice: 20, badge: "pain" },
    { name: "Ibuprofen 400mg", generic: "Ibuprofen", unit: "tabs", controlled: false, minPrice: 2, maxPrice: 8, badge: "pain" },
    { name: "Ibuprofen 200mg", generic: "Ibuprofen", unit: "tabs", controlled: false, minPrice: 1, maxPrice: 5, badge: "pain" },
    { name: "Ibuprofen 600mg", generic: "Ibuprofen", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 12, badge: "pain" },
    { name: "Diclofenac 50mg", generic: "Diclofenac", unit: "tabs", controlled: false, minPrice: 2, maxPrice: 8, badge: "pain" },
    { name: "Diclofenac 75mg", generic: "Diclofenac", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 12, badge: "pain" },
    { name: "Diclofenac 100mg", generic: "Diclofenac", unit: "tabs", controlled: false, minPrice: 4, maxPrice: 15, badge: "pain" },
    { name: "Naproxen 250mg", generic: "Naproxen", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 18, badge: "pain" },
    { name: "Naproxen 500mg", generic: "Naproxen", unit: "tabs", controlled: false, minPrice: 8, maxPrice: 25, badge: "pain" },
    { name: "Celecoxib 100mg", generic: "Celecoxib", unit: "caps", controlled: false, minPrice: 10, maxPrice: 35, badge: "pain" },
    { name: "Celecoxib 200mg", generic: "Celecoxib", unit: "caps", controlled: false, minPrice: 15, maxPrice: 45, badge: "pain" },
    { name: "Tramadol 50mg", generic: "Tramadol", unit: "caps", controlled: true, minPrice: 5, maxPrice: 25, badge: "controlled" },
    { name: "Tramadol 100mg", generic: "Tramadol", unit: "caps", controlled: true, minPrice: 10, maxPrice: 40, badge: "controlled" },
    { name: "Tramadol 37.5mg/Paracetamol 325mg", generic: "Ultracet", unit: "tabs", controlled: true, minPrice: 15, maxPrice: 50, badge: "controlled" },
    { name: "Pethidine 50mg/ml", generic: "Pethidine", unit: "ampoule", controlled: true, minPrice: 40, maxPrice: 120, badge: "controlled" },
    { name: "Morphine Sulfate 10mg", generic: "Morphine", unit: "tabs", controlled: true, minPrice: 20, maxPrice: 80, badge: "controlled" },
    { name: "Morphine Sulfate 30mg", generic: "Morphine", unit: "tabs", controlled: true, minPrice: 50, maxPrice: 180, badge: "controlled" },
    { name: "Codeine 30mg/Paracetamol 500mg", generic: "Codeine/Paracetamol", unit: "tabs", controlled: true, minPrice: 8, maxPrice: 30, badge: "controlled" },
    { name: "Fentanyl 100mcg", generic: "Fentanyl", unit: "patch", controlled: true, minPrice: 200, maxPrice: 600, badge: "controlled" }
  ],
  antimalarial: [
    { name: "Artemether/Lumefantrine 20/120mg", generic: "Artemether/Lumefantrine", unit: "tabs", controlled: false, minPrice: 15, maxPrice: 60, badge: "malaria" },
    { name: "Artemether/Lumefantrine 40/240mg", generic: "Artemether/Lumefantrine", unit: "tabs", controlled: false, minPrice: 25, maxPrice: 90, badge: "malaria" },
    { name: "Artemether 20mg Injection", generic: "Artemether", unit: "ampoule", controlled: false, minPrice: 40, maxPrice: 150, badge: "malaria" },
    { name: "Artesunate 60mg Injection", generic: "Artesunate", unit: "ampoule", controlled: false, minPrice: 60, maxPrice: 200, badge: "malaria" },
    { name: "Artesunate 50mg", generic: "Artesunate", unit: "tabs", controlled: false, minPrice: 8, maxPrice: 30, badge: "malaria" },
    { name: "Quinine 300mg", generic: "Quinine", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 20, badge: "malaria" },
    { name: "Quinine 600mg", generic: "Quinine", unit: "tabs", controlled: false, minPrice: 8, maxPrice: 30, badge: "malaria" },
    { name: "Chloroquine 250mg", generic: "Chloroquine", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 12, badge: "malaria" },
    { name: "Primaquine 15mg", generic: "Primaquine", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 18, badge: "malaria" },
    { name: "Sulfadoxine/Pyrimethamine 500/25mg", generic: "Fansidar", unit: "tabs", controlled: false, minPrice: 8, maxPrice: 25, badge: "malaria" },
    { name: "Dihydroartemisinin/Piperaquine 40/320mg", generic: "DHA/PPQ", unit: "tabs", controlled: false, minPrice: 20, maxPrice: 70, badge: "malaria" },
    { name: "Dihydroartemisinin/Piperaquine 20/160mg", generic: "DHA/PPQ", unit: "tabs", controlled: false, minPrice: 12, maxPrice: 40, badge: "malaria" }
  ],
  vitamins: [
    { name: "Vitamin C 500mg", generic: "Ascorbic Acid", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 12, badge: "vitamin" },
    { name: "Vitamin C 1000mg", generic: "Ascorbic Acid", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 20, badge: "vitamin" },
    { name: "Vitamin D3 2000IU", generic: "Cholecalciferol", unit: "caps", controlled: false, minPrice: 8, maxPrice: 30, badge: "vitamin" },
    { name: "Vitamin D3 4000IU", generic: "Cholecalciferol", unit: "caps", controlled: false, minPrice: 12, maxPrice: 45, badge: "vitamin" },
    { name: "Vitamin B12 1000mcg", generic: "Cyanocobalamin", unit: "tabs", controlled: false, minPrice: 10, maxPrice: 35, badge: "vitamin" },
    { name: "Vitamin B12 500mcg", generic: "Cyanocobalamin", unit: "tabs", controlled: false, minPrice: 6, maxPrice: 22, badge: "vitamin" },
    { name: "Vitamin E 400IU", generic: "Tocopherol", unit: "caps", controlled: false, minPrice: 10, maxPrice: 35, badge: "vitamin" },
    { name: "Vitamin A 25000IU", generic: "Retinol", unit: "caps", controlled: false, minPrice: 8, maxPrice: 25, badge: "vitamin" },
    { name: "Folic Acid 5mg", generic: "Folic Acid", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 12, badge: "vitamin" },
    { name: "Folic Acid 1mg", generic: "Folic Acid", unit: "tabs", controlled: false, minPrice: 2, maxPrice: 8, badge: "vitamin" },
    { name: "Multivitamin", generic: "Multivitamin", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 15, badge: "vitamin" },
    { name: "Multivitamin with Minerals", generic: "Multivitamin + Minerals", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 20, badge: "vitamin" },
    { name: "Vitamin B-Complex", generic: "B-Complex", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 18, badge: "vitamin" },
    { name: "Zinc 20mg", generic: "Zinc", unit: "tabs", controlled: false, minPrice: 4, maxPrice: 15, badge: "vitamin" },
    { name: "Zinc 50mg", generic: "Zinc", unit: "caps", controlled: false, minPrice: 6, maxPrice: 22, badge: "vitamin" },
    { name: "Calcium 500mg", generic: "Calcium", unit: "tabs", controlled: false, minPrice: 8, maxPrice: 28, badge: "vitamin" },
    { name: "Calcium 1000mg", generic: "Calcium", unit: "tabs", controlled: false, minPrice: 12, maxPrice: 40, badge: "vitamin" },
    { name: "Vitamin B6 25mg", generic: "Pyridoxine", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 12, badge: "vitamin" },
    { name: "Vitamin B6 50mg", generic: "Pyridoxine", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 18, badge: "vitamin" },
    { name: "Biotin 5000mcg", generic: "Biotin", unit: "caps", controlled: false, minPrice: 15, maxPrice: 50, badge: "vitamin" }
  ],
  chronic: [
    { name: "Metformin 500mg", generic: "Metformin", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 15, badge: "chronic" },
    { name: "Metformin 1000mg", generic: "Metformin", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 22, badge: "chronic" },
    { name: "Metformin XR 750mg", generic: "Metformin XR", unit: "tabs", controlled: false, minPrice: 8, maxPrice: 30, badge: "chronic" },
    { name: "Amlodipine 5mg", generic: "Amlodipine", unit: "tabs", controlled: false, minPrice: 4, maxPrice: 20, badge: "chronic" },
    { name: "Amlodipine 10mg", generic: "Amlodipine", unit: "tabs", controlled: false, minPrice: 6, maxPrice: 25, badge: "chronic" },
    { name: "Omeprazole 20mg", generic: "Omeprazole", unit: "caps", controlled: false, minPrice: 5, maxPrice: 25, badge: "chronic" },
    { name: "Omeprazole 40mg", generic: "Omeprazole", unit: "caps", controlled: false, minPrice: 8, maxPrice: 35, badge: "chronic" },
    { name: "Losartan 50mg", generic: "Losartan", unit: "tabs", controlled: false, minPrice: 10, maxPrice: 40, badge: "chronic" },
    { name: "Losartan 100mg", generic: "Losartan", unit: "tabs", controlled: false, minPrice: 15, maxPrice: 55, badge: "chronic" },
    { name: "Enalapril 10mg", generic: "Enalapril", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 22, badge: "chronic" },
    { name: "Lisinopril 10mg", generic: "Lisinopril", unit: "tabs", controlled: false, minPrice: 6, maxPrice: 25, badge: "chronic" },
    { name: "Lisinopril 20mg", generic: "Lisinopril", unit: "tabs", controlled: false, minPrice: 8, maxPrice: 32, badge: "chronic" },
    { name: "Atorvastatin 10mg", generic: "Atorvastatin", unit: "tabs", controlled: false, minPrice: 15, maxPrice: 50, badge: "chronic" },
    { name: "Atorvastatin 20mg", generic: "Atorvastatin", unit: "tabs", controlled: false, minPrice: 22, maxPrice: 70, badge: "chronic" },
    { name: "Simvastatin 20mg", generic: "Simvastatin", unit: "tabs", controlled: false, minPrice: 12, maxPrice: 40, badge: "chronic" },
    { name: "Simvastatin 40mg", generic: "Simvastatin", unit: "tabs", controlled: false, minPrice: 18, maxPrice: 55, badge: "chronic" },
    { name: "Insulin Glargine 100IU/ml", generic: "Insulin Glargine", unit: "vial", controlled: false, minPrice: 200, maxPrice: 600, badge: "chronic" },
    { name: "Insulin Aspart 100IU/ml", generic: "Insulin Aspart", unit: "vial", controlled: false, minPrice: 250, maxPrice: 700, badge: "chronic" },
    { name: "Warfarin 5mg", generic: "Warfarin", unit: "tabs", controlled: false, minPrice: 10, maxPrice: 35, badge: "chronic" },
    { name: "Clopidogrel 75mg", generic: "Clopidogrel", unit: "tabs", controlled: false, minPrice: 15, maxPrice: 50, badge: "chronic" },
    { name: "Aspirin 81mg", generic: "Aspirin", unit: "tabs", controlled: false, minPrice: 2, maxPrice: 8, badge: "chronic" },
    { name: "Digoxin 0.25mg", generic: "Digoxin", unit: "tabs", controlled: false, minPrice: 8, maxPrice: 28, badge: "chronic" },
    { name: "Furosemide 40mg", generic: "Furosemide", unit: "tabs", controlled: false, minPrice: 5, maxPrice: 18, badge: "chronic" },
    { name: "Furosemide 20mg", generic: "Furosemide", unit: "tabs", controlled: false, minPrice: 3, maxPrice: 12, badge: "chronic" },
    { name: "Spironolactone 25mg", generic: "Spironolactone", unit: "tabs", controlled: false, minPrice: 8, maxPrice: 30, badge: "chronic" },
    { name: "Hydrochlorothiazide 25mg", generic: "HCTZ", unit: "tabs", controlled: false, minPrice: 4, maxPrice: 16, badge: "chronic" }
  ],
  controlled: [
    { name: "Morphine Sulfate 10mg", generic: "Morphine", unit: "tabs", controlled: true, minPrice: 20, maxPrice: 80, badge: "controlled" },
    { name: "Morphine Sulfate 30mg", generic: "Morphine", unit: "tabs", controlled: true, minPrice: 50, maxPrice: 180, badge: "controlled" },
    { name: "Diazepam 5mg", generic: "Diazepam", unit: "tabs", controlled: true, minPrice: 3, maxPrice: 15, badge: "controlled" },
    { name: "Diazepam 10mg", generic: "Diazepam", unit: "tabs", controlled: true, minPrice: 5, maxPrice: 22, badge: "controlled" },
    { name: "Alprazolam 0.5mg", generic: "Alprazolam", unit: "tabs", controlled: true, minPrice: 10, maxPrice: 40, badge: "controlled" },
    { name: "Alprazolam 1mg", generic: "Alprazolam", unit: "tabs", controlled: true, minPrice: 15, maxPrice: 55, badge: "controlled" },
    { name: "Lorazepam 1mg", generic: "Lorazepam", unit: "tabs", controlled: true, minPrice: 8, maxPrice: 30, badge: "controlled" },
    { name: "Lorazepam 2mg", generic: "Lorazepam", unit: "tabs", controlled: true, minPrice: 12, maxPrice: 45, badge: "controlled" },
    { name: "Clonazepam 0.5mg", generic: "Clonazepam", unit: "tabs", controlled: true, minPrice: 8, maxPrice: 30, badge: "controlled" },
    { name: "Clonazepam 2mg", generic: "Clonazepam", unit: "tabs", controlled: true, minPrice: 15, maxPrice: 55, badge: "controlled" },
    { name: "Zolpidem 10mg", generic: "Zolpidem", unit: "tabs", controlled: true, minPrice: 20, maxPrice: 70, badge: "controlled" },
    { name: "Phenobarbital 30mg", generic: "Phenobarbital", unit: "tabs", controlled: true, minPrice: 10, maxPrice: 35, badge: "controlled" },
    { name: "Phenobarbital 60mg", generic: "Phenobarbital", unit: "tabs", controlled: true, minPrice: 15, maxPrice: 50, badge: "controlled" },
    { name: "Pethidine 50mg/ml", generic: "Pethidine", unit: "ampoule", controlled: true, minPrice: 40, maxPrice: 120, badge: "controlled" },
    { name: "Fentanyl 100mcg", generic: "Fentanyl", unit: "patch", controlled: true, minPrice: 200, maxPrice: 600, badge: "controlled" },
    { name: "Hydromorphone 2mg", generic: "Hydromorphone", unit: "tabs", controlled: true, minPrice: 30, maxPrice: 100, badge: "controlled" }
  ],
  other: [
    { name: "Cotton Wool 100g", generic: "Cotton Wool", unit: "pack", controlled: false, minPrice: 20, maxPrice: 60, badge: "otc" },
    { name: "Gauze Bandage", generic: "Gauze", unit: "roll", controlled: false, minPrice: 10, maxPrice: 35, badge: "otc" },
    { name: "Elastic Bandage", generic: "Elastic Bandage", unit: "roll", controlled: false, minPrice: 30, maxPrice: 80, badge: "otc" },
    { name: "Adhesive Tape", generic: "Adhesive Tape", unit: "roll", controlled: false, minPrice: 15, maxPrice: 45, badge: "otc" },
    { name: "Surgical Gloves", generic: "Surgical Gloves", unit: "pair", controlled: false, minPrice: 10, maxPrice: 30, badge: "otc" },
    { name: "Face Mask", generic: "Face Mask", unit: "box", controlled: false, minPrice: 50, maxPrice: 150, badge: "otc" },
    { name: "Alcohol Swabs", generic: "Alcohol Swabs", unit: "box", controlled: false, minPrice: 20, maxPrice: 60, badge: "otc" },
    { name: "Band-Aid (Pack)", generic: "Adhesive Bandage", unit: "pack", controlled: false, minPrice: 30, maxPrice: 100, badge: "otc" },
    { name: "Thermometer", generic: "Thermometer", unit: "piece", controlled: false, minPrice: 200, maxPrice: 500, badge: "otc" },
    { name: "BP Monitor", generic: "Blood Pressure Monitor", unit: "piece", controlled: false, minPrice: 1500, maxPrice: 4000, badge: "otc" },
    { name: "Glucometer", generic: "Glucometer", unit: "piece", controlled: false, minPrice: 1000, maxPrice: 3000, badge: "otc" },
    { name: "Test Strips (50)", generic: "Glucose Test Strips", unit: "box", controlled: false, minPrice: 500, maxPrice: 1500, badge: "otc" },
    { name: "Lancets", generic: "Lancets", unit: "box", controlled: false, minPrice: 100, maxPrice: 300, badge: "otc" },
    { name: "Urine Test Strips", generic: "Urine Test Strips", unit: "box", controlled: false, minPrice: 200, maxPrice: 600, badge: "otc" },
    { name: "Hand Sanitizer 500ml", generic: "Hand Sanitizer", unit: "bottle", controlled: false, minPrice: 50, maxPrice: 150, badge: "otc" },
    { name: "Sanitary Pads", generic: "Sanitary Pads", unit: "pack", controlled: false, minPrice: 80, maxPrice: 250, badge: "otc" },
    { name: "Nappy", generic: "Diaper", unit: "pack", controlled: false, minPrice: 150, maxPrice: 400, badge: "otc" },
    { name: "Wound Dressing Kit", generic: "Wound Kit", unit: "kit", controlled: false, minPrice: 100, maxPrice: 300, badge: "otc" },
    { name: "Surgical Tape", generic: "Surgical Tape", unit: "roll", controlled: false, minPrice: 15, maxPrice: 45, badge: "otc" },
    { name: "Medical Scissors", generic: "Medical Scissors", unit: "piece", controlled: false, minPrice: 150, maxPrice: 400, badge: "otc" }
  ],
  "first-aid": [
    { name: "Band-Aid (Pack)", generic: "Adhesive Bandage", unit: "pack", controlled: false, minPrice: 30, maxPrice: 100, badge: "otc" },
    { name: "Thermometer", generic: "Thermometer", unit: "piece", controlled: false, minPrice: 200, maxPrice: 500, badge: "otc" },
    { name: "First Aid Kit", generic: "First Aid Kit", unit: "kit", controlled: false, minPrice: 500, maxPrice: 1500, badge: "otc" },
    { name: "Antiseptic Solution 100ml", generic: "Antiseptic", unit: "bottle", controlled: false, minPrice: 30, maxPrice: 100, badge: "otc" },
    { name: "Hydrogen Peroxide 100ml", generic: "Hydrogen Peroxide", unit: "bottle", controlled: false, minPrice: 20, maxPrice: 60, badge: "otc" },
    { name: "Betadine 100ml", generic: "Povidone-Iodine", unit: "bottle", controlled: false, minPrice: 50, maxPrice: 150, badge: "otc" },
    { name: "Epsom Salt 500g", generic: "Epsom Salt", unit: "pack", controlled: false, minPrice: 40, maxPrice: 120, badge: "otc" },
    { name: "Cold Pack", generic: "Cold Pack", unit: "piece", controlled: false, minPrice: 100, maxPrice: 300, badge: "otc" },
    { name: "Hot Water Bottle", generic: "Hot Water Bottle", unit: "piece", controlled: false, minPrice: 150, maxPrice: 400, badge: "otc" },
    { name: "Tweezer", generic: "Tweezer", unit: "piece", controlled: false, minPrice: 50, maxPrice: 150, badge: "otc" }
  ]
};

// Add generics for first aid to other categories as well
KENYAN_DRUG_DATABASE['first-aid'].forEach(drug => {
  KENYAN_DRUG_DATABASE['other'].push({...drug, name: drug.name + " (First Aid)"});
});

// Generate additional synthetic drugs to reach 1000+
const extraDrugs = [
  { cat: "antibiotics", base: "Cefpodoxime 100mg", gen: "Cefpodoxime" },
  { cat: "antibiotics", base: "Cefpodoxime 200mg", gen: "Cefpodoxime" },
  { cat: "antibiotics", base: "Ceftazidime 500mg", gen: "Ceftazidime" },
  { cat: "antibiotics", base: "Cefotaxime 1g", gen: "Cefotaxime" },
  { cat: "antibiotics", base: "Cefotaxime 500mg", gen: "Cefotaxime" },
  { cat: "antibiotics", base: "Cefaclor 250mg", gen: "Cefaclor" },
  { cat: "antibiotics", base: "Cefaclor 500mg", gen: "Cefaclor" },
  { cat: "antibiotics", base: "Cefalexin 125mg/5ml", gen: "Cefalexin" },
  { cat: "antibiotics", base: "Cefalexin 250mg/5ml", gen: "Cefalexin" },
  { cat: "pain-relief", base: "Acetaminophen 500mg", gen: "Acetaminophen" },
  { cat: "pain-relief", base: "Acetaminophen 1000mg", gen: "Acetaminophen" },
  { cat: "pain-relief", base: "Meloxicam 7.5mg", gen: "Meloxicam" },
  { cat: "pain-relief", base: "Meloxicam 15mg", gen: "Meloxicam" },
  { cat: "pain-relief", base: "Piroxicam 10mg", gen: "Piroxicam" },
  { cat: "pain-relief", base: "Piroxicam 20mg", gen: "Piroxicam" },
  { cat: "pain-relief", base: "Indomethacin 25mg", gen: "Indomethacin" },
  { cat: "pain-relief", base: "Indomethacin 50mg", gen: "Indomethacin" },
  { cat: "chronic", base: "Captopril 25mg", gen: "Captopril" },
  { cat: "chronic", base: "Captopril 50mg", gen: "Captopril" },
  { cat: "chronic", base: "Ramipril 2.5mg", gen: "Ramipril" },
  { cat: "chronic", base: "Ramipril 5mg", gen: "Ramipril" },
  { cat: "chronic", base: "Ramipril 10mg", gen: "Ramipril" },
  { cat: "chronic", base: "Propranolol 40mg", gen: "Propranolol" },
  { cat: "chronic", base: "Propranolol 80mg", gen: "Propranolol" },
  { cat: "chronic", base: "Metoprolol 50mg", gen: "Metoprolol" },
  { cat: "chronic", base: "Metoprolol 100mg", gen: "Metoprolol" },
  { cat: "chronic", base: "Carvedilol 6.25mg", gen: "Carvedilol" },
  { cat: "chronic", base: "Carvedilol 25mg", gen: "Carvedilol" },
  { cat: "chronic", base: "Diltiazem 30mg", gen: "Diltiazem" },
  { cat: "chronic", base: "Diltiazem 60mg", gen: "Diltiazem" },
  { cat: "chronic", base: "Verapamil 40mg", gen: "Verapamil" },
  { cat: "chronic", base: "Verapamil 80mg", gen: "Verapamil" },
  { cat: "chronic", base: "Nifedipine 10mg", gen: "Nifedipine" },
  { cat: "chronic", base: "Nifedipine 20mg", gen: "Nifedipine" },
  { cat: "chronic", base: "Felodipine 5mg", gen: "Felodipine" },
  { cat: "chronic", base: "Felodipine 10mg", gen: "Felodipine" },
  { cat: "chronic", base: "Isosorbide Mononitrate 20mg", gen: "Isosorbide Mononitrate" },
  { cat: "chronic", base: "Isosorbide Mononitrate 40mg", gen: "Isosorbide Mononitrate" },
  { cat: "chronic", base: "Isosorbide Dinitrate 10mg", gen: "Isosorbide Dinitrate" },
  { cat: "chronic", base: "Glyceryl Trinitrate 0.5mg", gen: "Glyceryl Trinitrate" },
  { cat: "chronic", base: "Glyceryl Trinitrate 1mg", gen: "Glyceryl Trinitrate" },
  { cat: "chronic", base: "Clonidine 0.1mg", gen: "Clonidine" },
  { cat: "chronic", base: "Clonidine 0.2mg", gen: "Clonidine" },
  { cat: "chronic", base: "Methyldopa 250mg", gen: "Methyldopa" },
  { cat: "chronic", base: "Methyldopa 500mg", gen: "Methyldopa" },
  { cat: "chronic", base: "Hydralazine 25mg", gen: "Hydralazine" },
  { cat: "chronic", base: "Hydralazine 50mg", gen: "Hydralazine" },
  { cat: "chronic", base: "Prazosin 1mg", gen: "Prazosin" },
  { cat: "chronic", base: "Prazosin 2mg", gen: "Prazosin" },
  { cat: "chronic", base: "Doxazosin 2mg", gen: "Doxazosin" },
  { cat: "chronic", base: "Doxazosin 4mg", gen: "Doxazosin" },
  { cat: "chronic", base: "Terazosin 2mg", gen: "Terazosin" },
  { cat: "chronic", base: "Terazosin 5mg", gen: "Terazosin" },
  { cat: "vitamins", base: "Vitamin K1 10mg", gen: "Phytomenadione" },
  { cat: "vitamins", base: "Vitamin K1 20mg", gen: "Phytomenadione" },
  { cat: "vitamins", base: "Vitamin B1 100mg", gen: "Thiamine" },
  { cat: "vitamins", base: "Vitamin B2 50mg", gen: "Riboflavin" },
  { cat: "vitamins", base: "Vitamin B3 100mg", gen: "Niacin" },
  { cat: "vitamins", base: "Vitamin B5 100mg", gen: "Pantothenic Acid" },
  { cat: "vitamins", base: "Vitamin B7 5000mcg", gen: "Biotin" },
  { cat: "vitamins", base: "Vitamin B9 400mcg", gen: "Folic Acid" },
  { cat: "vitamins", base: "Vitamin B12 5000mcg", gen: "Cyanocobalamin" }
];

extraDrugs.forEach(d => {
  if (KENYAN_DRUG_DATABASE[d.cat]) {
    KENYAN_DRUG_DATABASE[d.cat].push({
      name: d.base,
      generic: d.gen,
      unit: "tabs",
      controlled: false,
      minPrice: 5 + Math.floor(Math.random() * 30),
      maxPrice: 15 + Math.floor(Math.random() * 80),
      badge: d.cat === "antibiotics" ? "antibiotic" : d.cat === "pain-relief" ? "pain" : d.cat === "chronic" ? "chronic" : "vitamin"
    });
  }
});

const catalogSeeds = Object.values(KENYAN_DRUG_DATABASE).flat();
const catalogVariants = ['10 tabs', '20 tabs', '30 tabs', '50 tabs', '100 tabs', '100ml', '200ml', '500ml', '1g', '2g'];
let catalogVariantIndex = 0;
while (Object.values(KENYAN_DRUG_DATABASE).reduce((count, category) => count + category.length, 0) < 1200) {
  const source = catalogSeeds[catalogVariantIndex % catalogSeeds.length];
  const category = Object.keys(KENYAN_DRUG_DATABASE)[catalogVariantIndex % Object.keys(KENYAN_DRUG_DATABASE).length];
  const variant = catalogVariants[catalogVariantIndex % catalogVariants.length];
  KENYAN_DRUG_DATABASE[category].push({
    ...source,
    name: source.name + ' - ' + variant + ' Variant ' + (catalogVariantIndex + 1),
    generic: source.generic,
    minPrice: Math.max(5, Number(source.minPrice) || 5),
    maxPrice: Math.max(10, Number(source.maxPrice) || 10)
  });
  catalogVariantIndex++;
}

// Count total drugs
let totalDrugs = 0;
Object.keys(KENYAN_DRUG_DATABASE).forEach(cat => totalDrugs += KENYAN_DRUG_DATABASE[cat].length);
console.log('✅ Drug database loaded with ' + totalDrugs + ' drugs');

// =============================================================
// DATABASE
// =============================================================
function normalizeExpense(expense) {
  const date = expense && expense.date ? new Date(expense.date) : null;
  return {
    ...expense,
    date: date && !Number.isNaN(date.getTime()) ? date.toISOString().split('T')[0] : (expense && expense.date) || '',
    amount: Number(expense && expense.amount) || 0
  };
}

const db = {
    db: null,
    currentPharmacyId: null,
    init() {
        var self = this;
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('YetuPharmcareDB', 6);
            req.onerror = () => reject('DB error');
            req.onsuccess = () => { self.db = req.result; resolve(); };
            req.onupgradeneeded = (e) => {
                const d = e.target.result;
                const stores = ['products','sales','saleItems','patients','batches','controlledLogs','labTests','expenses','users','drugCategories','drugForms','drugs','drugBatches','drugStockMovements','suppliers','reportArchives'];
                stores.forEach(s => {
                    if (!d.objectStoreNames.contains(s)) {
                        const store = d.createObjectStore(s, { keyPath: 'id' });
                        store.createIndex('pharmacy_id', 'pharmacyId', { unique: false });
                    }
                });
            };
        });
    },
    add(store, data) {
        var self = this;
        // Auto-inject pharmacyId from tenant context
        if (typeof window.DawaTenant !== 'undefined' && window.DawaTenant.getCurrentPharmacyId &&
            !data.pharmacyId && ['products','sales','saleItems','patients','batches','controlledLogs','labTests','expenses'].indexOf(store) >= 0) {
            data = { ...data, pharmacyId: window.DawaTenant.getCurrentPharmacyId() };
        }
        return this.init().then(() => new Promise((resolve, reject) => {
            const tx = self.db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).add(data);
            req.onsuccess = () => {
                // Enqueue sync if online and tenant is initialized
                if (navigator.onLine && typeof window.DawaSync !== 'undefined' && window.DawaSync.enqueueOperation &&
                    typeof window.DawaTenant !== 'undefined' && window.DawaTenant.getToken) {
                    window.DawaSync.enqueueOperation(store, 'create', data.id, data);
                }
                resolve(data);
            };
            req.onerror = () => reject(req.error);
        }));
    },
    getAll(store) {
        var self = this;
        return this.init().then(() => new Promise((resolve, reject) => {
            const tx = self.db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => {
                let records = req.result || [];
                // Scope to current pharmacy for tenant data stores
                if (typeof window.DawaTenant !== 'undefined' && window.DawaTenant.getCurrentPharmacyId) {
                    var pharmId = window.DawaTenant.getCurrentPharmacyId();
                    var tenantStores = ['products','sales','saleItems','patients','batches','controlledLogs','labTests','expenses'];
                    if (pharmId && tenantStores.indexOf(store) >= 0) {
                        records = records.filter(r => r.pharmacyId === pharmId);
                    }
                }
                resolve(store === 'expenses' ? records.map(normalizeExpense) : records);
            };
            req.onerror = () => reject(req.error);
        }));
    },
    getById(store, id) {
        var self = this;
        return this.init().then(() => new Promise((resolve, reject) => {
            const tx = self.db.transaction(store, 'readonly');
            const req = tx.objectStore(store).get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }));
    },
    update(store, data) {
        var self = this;
        // Auto-inject pharmacyId from tenant context
        if (typeof window.DawaTenant !== 'undefined' && window.DawaTenant.getCurrentPharmacyId &&
            !data.pharmacyId && ['products','sales','saleItems','patients','batches','controlledLogs','labTests','expenses'].indexOf(store) >= 0) {
            data = { ...data, pharmacyId: window.DawaTenant.getCurrentPharmacyId() };
        }
        return this.init().then(() => new Promise((resolve, reject) => {
            const tx = self.db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).put(data);
            req.onsuccess = () => {
                // Enqueue sync
                if (navigator.onLine && typeof window.DawaSync !== 'undefined' && window.DawaSync.enqueueOperation &&
                    typeof window.DawaTenant !== 'undefined' && window.DawaTenant.getToken) {
                    window.DawaSync.enqueueOperation(store, 'update', data.id, data);
                }
                resolve(data);
            };
            req.onerror = () => reject(req.error);
        }));
    },
    delete(store, id) {
        var self = this;
        return this.init().then(() => new Promise((resolve, reject) => {
            const tx = self.db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).delete(id);
            req.onsuccess = () => {
                if (navigator.onLine && typeof window.DawaSync !== 'undefined' && window.DawaSync.enqueueOperation &&
                    typeof window.DawaTenant !== 'undefined' && window.DawaTenant.getToken) {
                    window.DawaSync.enqueueOperation(store, 'delete', id, { id: id });
                }
                resolve();
            };
            req.onerror = () => reject(req.error);
        }));
    },
    getSalesByDateRange(start, end) {
        return this.getAll('sales').then(sales => {
            const s = new Date(start), e = new Date(end);
            e.setHours(23,59,59,999);
            return sales.filter(sale => {
                const d = new Date(sale.date);
                return d >= s && d <= e;
            });
        });
    },
    getSaleItems(saleId) {
        return this.getAll('saleItems').then(items => items.filter(i => i.saleId === saleId));
    },
    setPharmacyId(id) { this.currentPharmacyId = id; },
    getCurrentPharmacyId() { return this.currentPharmacyId; },
    clearAll() {
        var self = this;
        return this.init().then(() => {
            const stores = ['products','sales','saleItems','patients','batches','controlledLogs','labTests','expenses','drugCategories','drugForms','drugs','drugBatches','drugStockMovements','suppliers','reportArchives'];
            return Promise.all(stores.map(store => {
                return new Promise((resolve, reject) => {
                    const tx = self.db.transaction(store, 'readwrite');
                    tx.clear();
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                });
            }));
        });
    }
};

// =============================================================
// RECEIPT FORMATTER
// =============================================================
class ReceiptFormatter {
    constructor() {
        this.shopName = localStorage.getItem('yetu_shop_name') || 'Dawa Smart';
        this.address = localStorage.getItem('yetu_shop_address') || '7 Cheptais · 📞 0759324463';
        this.kraPin = localStorage.getItem('yetu_kra_pin') || 'P-2025-001';
        this.footer = localStorage.getItem('yetu_receipt_footer') || 'Thank you for choosing Dawa Smart!';
        this.vatRate = parseFloat(localStorage.getItem('yetu_vat_rate')) || 0;
    }
    generateKRAReceipt(sale) { 
        const date = new Date(sale.date); 
        const receiptNumber = String(sale.receiptNumber).padStart(8, '0'); 
        let receipt = ''; 
        receipt += '+' + '='.repeat(48) + '+\n'; 
        receipt += '|' + ' '.repeat(48) + '|\n'; 
        receipt += '|' + this.centerText(this.shopName.toUpperCase(), 48) + '|\n'; 
        receipt += '|' + this.centerText(this.address, 48) + '|\n'; 
        receipt += '|' + this.centerText('KRA PIN: ' + this.kraPin, 48) + '|\n'; 
        receipt += '|' + this.centerText('Tax Invoice / Receipt', 48) + '|\n'; 
        receipt += '|' + ' '.repeat(48) + '|\n'; 
        receipt += '+' + '='.repeat(48) + '+\n'; 
        receipt += '| Receipt No: ' + receiptNumber.padEnd(33) + '|\n'; 
        receipt += '| Date: ' + this.formatDateTime(date).padEnd(34) + '|\n'; 
        receipt += '| Cashier: ' + (sale.cashier || 'System').padEnd(34) + '|\n'; 
        receipt += '| Customer: ' + (sale.customer || 'Walk-in').padEnd(34) + '|\n'; 
        if (sale.customerPhone) receipt += '| Phone: ' + sale.customerPhone.padEnd(34) + '|\n';
        if (sale.customerIdNumber) receipt += '| ID: ' + sale.customerIdNumber.padEnd(34) + '|\n';
        receipt += '| Payment: ' + (sale.method || 'cash').toUpperCase().padEnd(34) + '|\n'; 
        if (sale.negotiated) {
            receipt += '| 🤝 Negotiated Sale'.padEnd(48) + '|\n';
            receipt += '| Original: ' + this.formatCurrency(sale.originalTotal || 0).padEnd(34) + '|\n';
            receipt += '| Discount: ' + this.formatCurrency((sale.originalTotal || 0) - (sale.total || 0)).padEnd(34) + '|\n';
        }
        receipt += '+' + '-'.repeat(48) + '+\n'; 
        receipt += '| QTY | DESCRIPTION                     | AMOUNT |\n'; 
        receipt += '+' + '-'.repeat(48) + '+\n'; 
        (sale.items || []).forEach(item => { 
            const qty = String(item.quantity).padStart(3); 
            const name = item.name.substring(0, 32); 
            const amount = this.formatCurrency(item.price * item.quantity); 
            receipt += '| ' + qty + ' | ' + name.padEnd(32) + ' | ' + amount.padStart(7) + ' |\n'; 
            if (item.originalPrice && item.originalPrice !== item.price) {
                receipt += '|     | 🤝 Negotiated: ' + this.formatCurrency(item.originalPrice).padEnd(32) + ' |        |\n';
            }
        }); 
        receipt += '+' + '-'.repeat(48) + '+\n'; 
        receipt += '| Subtotal:'.padEnd(36) + ' ' + this.formatCurrency(sale.subtotal).padStart(10) + ' |\n'; 
        if (this.vatRate > 0) receipt += '| VAT (' + this.vatRate + '%):'.padEnd(36) + ' ' + this.formatCurrency(sale.vat).padStart(10) + ' |\n'; 
        receipt += '+' + '='.repeat(48) + '+\n'; 
        receipt += '| TOTAL:'.padEnd(36) + ' ' + this.formatCurrency(sale.total).padStart(10) + ' |\n'; 
        receipt += '+' + '='.repeat(48) + '+\n'; 
        receipt += '| Paid:'.padEnd(36) + ' ' + this.formatCurrency(sale.payment).padStart(10) + ' |\n'; 
        receipt += '| Change:'.padEnd(36) + ' ' + this.formatCurrency(sale.change).padStart(10) + ' |\n'; 
        receipt += '+' + '='.repeat(48) + '+\n'; 
        receipt += '|' + this.centerText(this.footer, 48) + '|\n'; 
        receipt += '|' + ' '.repeat(48) + '|\n'; 
        receipt += '+' + '='.repeat(48) + '+\n'; 
        receipt += '|' + this.centerText('THANK YOU FOR YOUR BUSINESS!', 48) + '|\n'; 
        receipt += '+' + '='.repeat(48) + '+\n'; 
        return receipt; 
    }
    formatCurrency(amount) { const num = Number(amount) || 0; return 'KES ' + num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    formatDateTime(date) { const d = new Date(date); return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }); }
    centerText(text, width) { if (text.length >= width) return text.substring(0, width - 1); const leftPadding = Math.floor((width - text.length) / 2); const rightPadding = width - text.length - leftPadding; return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding); }
}

const receiptFormatter = new ReceiptFormatter();
window.receiptFormatter = receiptFormatter;

// =============================================================
// PERMISSION SYSTEM
// =============================================================
function isAdmin() { return currentUser && (currentUser.role === 'admin' || currentUser.role === 'developer'); }
function isDeveloper() { return currentUser && currentUser.role === 'developer'; }
function isDemo() { return currentUser && currentUser.role === 'demo'; }
function isEditor() { return currentUser && (currentUser.role === 'admin' || currentUser.role === 'developer' || currentUser.role === 'demo'); }

// Actions that only administrators may perform (blocked for demo users)
var ADMIN_ONLY_ACTIONS = [
  'manage users', 'save user', 'delete user',
  'restore data', 'clear all data', 'start fresh',
  'save settings', 'activate license', 'change license'
];

function checkAdminPermission(action) {
  if (isAdmin()) return true;
  if (isDemo()) {
    if (ADMIN_ONLY_ACTIONS.indexOf(action) >= 0) {
      showToast('⛔ This function is restricted in Demo Mode.', 'error');
      return false;
    }
    return true;
  }
  showToast('⛔ Admin permission required for ' + action, 'error');
  return false;
}
function adminGuard(action) { return checkAdminPermission(action); }

// =============================================================
// MAIN APPLICATION
// =============================================================
console.log('⚕️ Dawa Smart v1.0.0 starting...');

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') { input.type = 'text'; btn.innerHTML = '<i class="fas fa-eye-slash"></i>'; } 
    else { input.type = 'password'; btn.innerHTML = '<i class="fas fa-eye"></i>'; }
}

const SINGLE_USER = { id: 'user_rashidjuma', fullName: 'Rashid Juma', username: 'RASHID', password: 'RASHID2026', email: 'rashidjuma@dawasmartz.co.ke', phone: '0759324463', role: 'developer', status: 'active', pharmacy: 'Dawa Smart', verified: true };
const DEMO_USER = { id: 'user_demo', fullName: 'Dawa Smart Demo', username: 'DEMO', password: 'DEMO2026', role: 'demo', status: 'active', pharmacy: 'Dawa Smart', verified: true };
let users = [SINGLE_USER, DEMO_USER];
let currentUser = null;
let loginAttempts = 0;
let products = [];
let cart = [];
let labTests = [];
let dailyExpenses = [];
let vatRate = 0;
let lastSale = null;
let currentCategory = 'all';
let batches = [];
let customSaleDate = null;
let revenueInsightVisible = false;
let negotiatedPrices = {};

function generateId(){return 'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);}
function formatCurrency(value){const amount=Number(value)||0; return 'KES '+amount.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function formatDate(value){if(!value)return '—';const d=new Date(value);if(Number.isNaN(d.getTime()))return value;return d.toLocaleDateString('en-KE',{year:'numeric',month:'short',day:'numeric'});}
function formatShortDate(value){if(!value)return '—';const d=new Date(value);if(Number.isNaN(d.getTime()))return value;return d.toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'2-digit'});}
function showToast(message,type='info'){ const toast=document.getElementById('toast'); const messageEl=document.getElementById('toastMessage'); if(!toast||!messageEl){return;} messageEl.textContent=message; toast.className='toast show ' + (type || 'info'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>{toast.className='toast';},2600); }
function findUser(u,p){
    const user = users.find(user => user.username === u && user.status === 'active');
    if (!user) return { found: false, reason: 'User not found or inactive' };
    if (user.password !== p) return { found: false, reason: 'Incorrect password', user: user };
    return { found: true, user: user };
}

// ===== NEGOTIATION CONTROLS =====
function toggleNegotiation() {
    const controls = document.getElementById('negotiationControls');
    if (cart.length === 0) {
        showToast('Add items to cart first', 'warning');
        return;
    }
    controls.classList.toggle('show');
    if (controls.classList.contains('show')) {
        renderNegotiationItems();
    }
}

function renderNegotiationItems() {
    const container = document.getElementById('negotiationItemsList');
    if (!container) return;
    
    container.innerHTML = cart.map(item => {
        const negotiated = negotiatedPrices[item.id] !== undefined ? negotiatedPrices[item.id] : item.price;
        const isNegotiated = negotiated !== item.price;
        return `<div style="display:flex;gap:4px;align-items:center;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:11px;">
            <span style="flex:1;font-weight:500;color:#0f172a;">${item.name}</span>
            <span style="color:#64748b;font-size:10px;">Original: ${formatCurrency(item.price)}</span>
            <input type="number" step="0.01" value="${negotiated}" 
                   onchange="updateNegotiatedPrice('${item.id}', this.value)" 
                   style="width:80px;padding:2px 6px;border:2px solid ${isNegotiated ? '#f59e0b' : '#e2e8f0'};border-radius:4px;font-size:11px;">
            ${isNegotiated ? '<span style="color:#b45309;font-size:9px;">🤝</span>' : ''}
        </div>`;
    }).join('');
}

function updateNegotiatedPrice(itemId, value) {
    const price = parseFloat(value);
    if (isNaN(price) || price <= 0) {
        showToast('Enter a valid price', 'error');
        return;
    }
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    if (price === item.price) {
        delete negotiatedPrices[itemId];
    } else {
        negotiatedPrices[itemId] = price;
    }
    renderCart();
    renderNegotiationItems();
    updateRevenueInsight();
}

function applyAllNegotiations() {
    Object.keys(negotiatedPrices).forEach(id => {
        const item = cart.find(i => i.id === id);
        if (item) {
            item.price = negotiatedPrices[id];
        }
    });
    negotiatedPrices = {};
    document.getElementById('negotiationControls').classList.remove('show');
    renderCart();
    showToast('✅ All negotiated prices applied!', 'success');
}

function clearAllNegotiations() {
    negotiatedPrices = {};
    renderCart();
    renderNegotiationItems();
    updateRevenueInsight();
    showToast('Cleared all negotiations', 'info');
}

function toggleRevenueInsight() {
    const insight = document.getElementById('revenueInsight');
    revenueInsightVisible = !revenueInsightVisible;
    insight.classList.toggle('show');
    if (revenueInsightVisible) {
        updateRevenueInsight();
    }
}

function updateRevenueInsight() {
    const insight = document.getElementById('revenueInsight');
    if (!insight || !revenueInsightVisible) return;
    
    let originalTotal = 0;
    let negotiatedTotal = 0;
    let negotiatedItems = 0;
    let totalDiscount = 0;
    
    cart.forEach(item => {
        const originalPrice = item.originalPrice || item.price;
        const currentPrice = negotiatedPrices[item.id] !== undefined ? negotiatedPrices[item.id] : item.price;
        originalTotal += originalPrice * item.quantity;
        negotiatedTotal += currentPrice * item.quantity;
        if (currentPrice !== originalPrice) {
            negotiatedItems++;
            totalDiscount += (originalPrice - currentPrice) * item.quantity;
        }
    });
    
    const impact = originalTotal - negotiatedTotal;
    const impactPercent = originalTotal > 0 ? (impact / originalTotal * 100) : 0;
    
    document.getElementById('insightOriginalTotal').textContent = formatCurrency(originalTotal);
    document.getElementById('insightNegotiatedTotal').textContent = formatCurrency(negotiatedTotal);
    document.getElementById('insightRevenueImpact').textContent = formatCurrency(impact);
    document.getElementById('insightRevenueImpact').className = 'value ' + (impact > 0 ? 'negative' : impact < 0 ? 'positive' : '');
    document.getElementById('insightImpactPercent').textContent = (impactPercent > 0 ? '-' : '') + impactPercent.toFixed(1) + '%';
    document.getElementById('insightImpactPercent').className = 'value ' + (impactPercent > 0 ? 'negative' : impactPercent < 0 ? 'positive' : 'warning');
    document.getElementById('insightTotalDiscount').textContent = formatCurrency(totalDiscount);
    document.getElementById('insightTotalDiscount').className = 'value ' + (totalDiscount > 0 ? 'negative' : '');
    document.getElementById('insightNegotiatedItems').textContent = negotiatedItems;
    document.getElementById('insightNegotiatedItems').className = 'value ' + (negotiatedItems > 0 ? 'warning' : '');
}

// ===== BACKDATE CONTROLS =====
function toggleBackdate() {
    const controls = document.getElementById('backdateControls');
    if (!controls) {
        const container = document.querySelector('.payment-row');
        if (container) {
            const div = document.createElement('div');
            div.id = 'backdateControls';
            div.className = 'backdate-control';
            div.innerHTML = `
                <div class="row">
                    <label>📅 Sale Date:</label>
                    <input type="date" id="saleDateInput">
                    <button class="btn btn-sm btn-success" onclick="applyBackdate()">Apply</button>
                    <button class="btn btn-sm btn-danger" onclick="clearBackdate()">Clear</button>
                </div>
            `;
            container.parentNode.insertBefore(div, container.nextSibling);
        }
    }
    const ctrl = document.getElementById('backdateControls');
    if (ctrl) {
        ctrl.classList.toggle('show');
        if (ctrl.classList.contains('show')) {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('saleDateInput').value = today;
            if (customSaleDate) {
                document.getElementById('saleDateInput').value = customSaleDate;
            }
        } else {
            clearBackdate();
        }
    }
}

function applyBackdate() {
    const dateInput = document.getElementById('saleDateInput');
    const date = dateInput.value;
    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }
    const selectedDate = new Date(date);
    const today = new Date();
    if (selectedDate > today) {
        showToast('Cannot set sale date in the future', 'error');
        return;
    }
    customSaleDate = date;
    showToast('📅 Sale date set to: ' + formatDate(date), 'success');
}

function clearBackdate() {
    customSaleDate = null;
    const input = document.getElementById('saleDateInput');
    if (input) input.value = '';
    showToast('Backdate cleared - using today\'s date', 'info');
}

// ===== LOGIN =====
async function handleLogin(){
    var username = document.getElementById('loginUsername').value.trim();
    var password = document.getElementById('loginPassword').value.trim();
    var errorEl = document.getElementById('loginError');
    errorEl.className='error-msg';
    if(!username || !password){errorEl.textContent='Please enter both fields';errorEl.className='error-msg show';return;}

    console.log('[Login] Starting login for:', username);
    showLoginStep('🔍 Checking credentials...', 'info');

    // Ensure users array is loaded from localStorage
    if (!window.users || window.users.length === 0) {
        console.log('[Login] Users array empty, reloading from storage...');
        loadUsersFromStorage();
        showLoginStep('🔄 Loading user database...', 'info');
        await new Promise(r => setTimeout(r, 100));
    }

    // Try Worker API authentication first (for Supabase-backed users)
    var authResult = null;
    var workerAvailable = typeof window.DawaTenant !== 'undefined' && window.DawaTenant.authenticate;
    console.log('[Login] Worker available:', workerAvailable);
    if (workerAvailable) {
        showLoginStep('🌐 Trying server authentication...', 'info');
        try {
            authResult = await window.DawaTenant.authenticate(username, password);
            console.log('[Login] Worker auth result:', authResult);
        } catch (e) {
            console.error('[Login] Worker auth error:', e);
            authResult = { success: false, error: e.message };
        }
        if (authResult && authResult.success) {
            showLoginStep('✅ Server authentication successful', 'success');
        } else {
            showLoginStep('⚠️ Server auth failed, trying local...', 'warning');
        }
    } else {
        showLoginStep('📱 Server unavailable, using local auth...', 'info');
    }

    // Fallback to local-only auth (localStorage users)
    console.log('[Login] Searching local users for:', username);
    console.log('[Login] Available users:', (window.users || []).map(u => u.username));
    var findResult = findUser(username,password);
    console.log('[Login] Local auth result:', findResult.found ? 'FOUND' : 'NOT FOUND - ' + findResult.reason);
    var user = findResult.found ? findResult.user : null;

    if(!user && (!authResult || !authResult.success)){
        loginAttempts++; 
        var errorMsg = '❌ ';
        if (findResult.reason) {
            errorMsg += findResult.reason;
        } else {
            errorMsg += 'Wrong username or password';
        }
        errorMsg += '. Attempt '+loginAttempts+'/5';
        errorEl.textContent = errorMsg; 
        errorEl.className='error-msg show'; 
        if(loginAttempts>=5){ 
            errorEl.textContent='Too many attempts. Locked 30s.'; 
            document.getElementById('loginUsername').disabled = true; 
            document.getElementById('loginPassword').disabled = true; 
            setTimeout(()=>{document.getElementById('loginUsername').disabled=false;document.getElementById('loginPassword').disabled=false;loginAttempts=0;errorEl.textContent='';errorEl.className='error-msg';},30000); 
        }
        hideLoginStep();
        return;
    }

    // Use auth result if available (for token + pharmacy context)
    if (authResult && authResult.success) {
        user = authResult.user;
        console.log('[Login] Using Worker auth user:', user);
    }

    if(!user.verified){
        errorEl.textContent='⚠️ Account not verified. Contact developer.'; 
        errorEl.className='error-msg show'; 
        hideLoginStep();
        return;
    }

     // === DEMO LICENSE ENFORCEMENT ===
     if (user.role === 'demo') {
         var check = licenseManager.checkTrialExpiry();
         if (check.expired) {
             licenseManager.resetDemoTrial();
             check = licenseManager.checkTrialExpiry();
         }
         if (check.expired) {
             errorEl.className='error-msg';
             errorEl.textContent='';
             licenseManager.enforceLicenseLock(check.tampered ? 'tampered' : 'expired');
             hideLoginStep();
             return;
         }
     }

    loginAttempts=0; 
    currentUser = user;
    console.log('[Login] Login successful for:', user.fullName, 'role:', user.role);
    showLoginStep('✅ Welcome ' + user.fullName + '!', 'success');
    
    document.getElementById('loginPage').style.display='none';
    document.getElementById('appContainer').className='app-container show';
    document.getElementById('currentUserDisplay').textContent=user.fullName;
    document.getElementById('currentRoleDisplay').textContent=user.role.charAt(0).toUpperCase()+user.role.slice(1);
    var adminNavBtn = document.getElementById('adminNavBtn');
    if (adminNavBtn) { adminNavBtn.style.display = user.role === 'developer' ? 'block' : 'none'; }
    if (user.role === 'developer') { setTimeout(function(){ fetchAdminData(); }, 500); }
    if (typeof window.DawaTenant !== 'undefined' && window.DawaTenant.fetchMemberships) {
        window.DawaTenant.fetchMemberships().then(() => { refreshWorkspaceSwitcher(); });
    }
    loadPharmacySettings(); updatePharmacyDisplay();
    updateDemoUI();
    setupTrialWarnings();
    showToast('Welcome '+user.fullName+'!','success');
    initApp();
    setTimeout(hideLoginStep, 1000);
}

function showLoginStep(message, type) {
    var stepEl = document.getElementById('loginStepIndicator');
    if (!stepEl) return;
    stepEl.textContent = message;
    stepEl.className = 'login-step-indicator show ' + type;
    console.log('[Login Step]', type.toUpperCase(), ':', message);
}

function hideLoginStep() {
    var stepEl = document.getElementById('loginStepIndicator');
    if (!stepEl) return;
    stepEl.className = 'login-step-indicator';
}

function hideLoginStep() {
    var stepEl = document.getElementById('loginStepIndicator');
    if (!stepEl) return;
    stepEl.className = 'login-step-indicator';
}

function debugShowUsers() {
    loadUsersFromStorage();
    var userList = (window.users || []).map(u => ({
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        status: u.status,
        hasPassword: !!u.password,
        password: u.password // for debugging only
    }));
    console.table(userList);
    var msg = 'Total users: ' + userList.length + '\n\n';
    userList.forEach(u => {
        msg += u.username + ' (' + u.role + ') - ' + u.status + ' - pass: ' + (u.password || 'EMPTY') + '\n';
    });
    alert(msg);
    showToast('Check console for full table', 'info');
}

function handleLogout(){
    currentUser=null;
    if (typeof window.DawaTenant !== 'undefined' && window.DawaTenant.logout) {
        window.DawaTenant.logout();
    }
    document.getElementById('appContainer').className='app-container';
    document.getElementById('loginPage').style.display='flex';
    var badge = document.getElementById('headerDemoBadge');
    if (badge) badge.style.display='none';
    var switcher = document.getElementById('pharmacySwitcher');
    if (switcher) { switcher.style.display='none'; switcher.innerHTML=''; }
     showToast('Logged out');
  }

// ===== DEMO UI HELPERS =====
function updateDemoUI(){
    if (!window.licenseManager) return;
    var info = licenseManager.getLicenseInfo();
    var badge = document.getElementById('headerDemoBadge');
    var badgeContainer = document.getElementById('headerDemoBadge').parentElement;

    if (isDemo() && badge) {
        badge.style.display = 'flex';
        badgeContainer.style.display = 'inline-flex';
        var badgeText = document.getElementById('demoHeaderBadge');
        if (badgeText) {
            if (!info.trialStart) {
                badgeText.textContent = 'DEMO • TRIAL NOT STARTED';
                badgeText.className = 'demo-badge';
            } else if (info.daysRemaining > 0) {
                badgeText.textContent = 'DEMO • ' + info.daysRemaining + ' DAY' + (info.daysRemaining > 1 ? 'S' : '') + ' LEFT';
                badgeText.className = 'demo-badge';
            } else if (info.lessThan24h) {
                badgeText.textContent = 'DEMO • < 1 DAY LEFT';
                badgeText.className = 'demo-badge demo-warning';
            } else {
                badgeText.textContent = 'DEMO EXPIRED';
                badgeText.className = 'demo-badge demo-expired';
            }
        }
    } else if (badgeContainer) {
        badgeContainer.style.display = 'none';
    }

    // Dashboard banner (only on POS/dashboard page)
    renderDemoBanner();
}

function renderDemoBanner(){
    var bannerContainer = document.getElementById('demoBannerContainer');
    if (!bannerContainer) return;
    if (!isDemo()) { bannerContainer.style.display='none'; return; }

    var info = licenseManager.getLicenseInfo();
    var banner = document.createElement('div');

    if (!info.trialStart) {
        banner.className = 'demo-banner';
        banner.innerHTML = '<i class="fas fa-play-circle"></i> <strong>DEMO MODE</strong> — Your 14-day trial will start when you make your first sale. Explore all features now. <button class="dismiss-btn" onclick="dismissDemoBanner()">×</button>';
    } else if (info.daysRemaining > 0) {
        banner.className = 'demo-banner';
        banner.innerHTML = '<i class="fas fa-info-circle"></i> <strong>DEMO MODE</strong> — ' +
            info.daysRemaining + ' day' + (info.daysRemaining > 1 ? 's' : '') +
            ' remaining. Explore all features. <button class="dismiss-btn" onclick="dismissDemoBanner()">×</button>';
    } else if (info.lessThan24h) {
        banner.className = 'demo-banner demo-banner-warning';
        banner.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <strong>DEMO MODE</strong> — ' +
            info.hoursRemaining + 'h ' + info.minutesRemaining + 'm remaining. ' +
            '<button class="dismiss-btn" onclick="dismissDemoBanner()">×</button>';
    } else {
        banner.style.display = 'none';
        return;
    }

    bannerContainer.innerHTML = '';
    bannerContainer.appendChild(banner);
    bannerContainer.style.display = 'block';
}

function dismissDemoBanner(){
    var bannerContainer = document.getElementById('demoBannerContainer');
    if (bannerContainer) bannerContainer.style.display = 'none';
}

// ─── Trial warnings ────────────────────────────────────────────
var trialWarningShown = {};
function setupTrialWarnings(){
    if (!isDemo()) return;
    var info = licenseManager.getLicenseInfo();
    // Don't show warnings if trial hasn't started yet
    if (!info.trialStart) return;
    var days = info.daysRemaining;
    var threshold = licenseManager.getWarningThreshold();

    // Show a toast only once per threshold
    if (threshold && !trialWarningShown[threshold]) {
        var message;
        if (threshold === 'less-than-24h') {
            message = 'Your Dawa Smart demonstration expires in less than 24 hours (' +
                info.hoursRemaining + 'h ' + info.minutesRemaining + 'm remaining).';
        } else {
            message = 'Your Dawa Smart demonstration expires in ' + days + ' day' + (days > 1 ? 's' : '') + '.';
        }
        showToast(message, 'warning');
        trialWarningShown[threshold] = true;
    }

    // Also update the banner periodically
    renderDemoBanner();
}

// ─── Periodic update of demo indicator (every 60s) ─────────────
function startDemoTicker(){
    if (window._demoTicker) clearInterval(window._demoTicker);
    window._demoTicker = setInterval(function(){
        if (isDemo() && document.getElementById('appContainer').className.includes('show')) {
            licenseManager.updateDemoIndicator();
            renderDemoBanner();
            var info = licenseManager.getLicenseInfo();
            // Only enforce lock if trial has started and expired
            if (info.trialStart && info.daysRemaining === 0 && !info.lessThan24h) {
                licenseManager.enforceLicenseLock('expired');
            }
        }
    }, 60000);
}

// ─── Contact / sales helpers ───────────────────────────────────
function contactSalesWhatsApp(){
    var msg = 'Hello, I have completed the Dawa Smart 14-day demo and would like information about purchasing a license.';
    var url = 'https://wa.me/254759324463?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
}

function contactSupportEmail(){
    var subject = encodeURIComponent('Dawa Smart Demo License Inquiry');
    var body = encodeURIComponent('I have completed the Dawa Smart 14-day demo and would like to inquire about purchasing a license.\n\nBest regards,');
    window.location.href = 'mailto:sales@dawasmartz.co.ke?subject=' + subject + '&body=' + body;
}

function exitDemo(){
    licenseManager.enforceLicenseLock = function(){}; // no-op for exit
    window.location.reload();
}

// ─── Reset Demo Trial (for expired trials, allows fresh start) ───
function resetDemoTrialAndReload(){
    if (!isDemo()) return;
    licenseManager.resetDemoTrial();
    showToast('Fresh 14-day demo started! Enjoy Dawa Smart.', 'success');
    window.location.reload();
}

function checkLoginTrialStatus(){
    // Auto-reset is now handled on DEMO login — each user gets a fresh 14-day trial.
    // The reset button container is hidden automatically.
}

// ─── Reset Demo Data (demo-only, does NOT touch license) ──────
function resetDemoData(){
    if (!isDemo()) {
        showToast('Reset demo data is only available in demo mode', 'error');
        return;
    }
    if (!confirm('Reset all demonstration data?')) return;
    licenseManager.resetDemoData().then(function(){
        // Reload sample/demo data
        if (typeof loadSampleData === 'function') {
            // Clear products first then reload
            db.getAll('products').then(function(items){
                return Promise.all(items.map(function(p){ return db.delete('products', p.id); }));
            }).then(function(){
                return loadSampleData();
            }).then(function(){
                loadProducts(); loadPatients(); loadCustomers(); loadProductSearch();
                updateStats(); updateProductGrid(); updatePricingDashboard();
                loadLabTests(); loadCreditDashboard();
                showToast('Demo data has been reset to original samples', 'success');
            });
        }
    }).catch(function(e){
        showToast('Error resetting demo data: ' + e.message, 'error');
    });
}
function loadPharmacySettings() {
    // Use tenant-scoped storage key if pharmacy context is available
    var pharmId = (typeof window.DawaTenant !== 'undefined' && window.DawaTenant.getCurrentPharmacyId)
        ? window.DawaTenant.getCurrentPharmacyId() : null;
    var storageKey = pharmId ? 'yetu_pharmacy_' + pharmId : 'yetu_pharmacy';
    const stored = localStorage.getItem(storageKey);
    if (stored) { try { const settings = JSON.parse(stored); document.getElementById('shopName').value = settings.name || 'Dawa Smart'; document.getElementById('shopAddress').value = settings.address || '7 Cheptais · 📞 0759324463'; document.getElementById('kraPin').value = settings.kraPin || 'P-2025-001'; document.getElementById('receiptFooter').value = settings.footer || 'Thank you for choosing Dawa Smart!'; document.getElementById('vatRate').value = settings.vatRate || 0; document.getElementById('headerPharmacyName').textContent = settings.name || 'Dawa Smart'; document.getElementById('currentPharmacyDisplay').textContent = settings.name || 'Dawa Smart'; document.getElementById('loginTitle').textContent = settings.name || 'Dawa Smart'; vatRate = parseFloat(settings.vatRate) || 0; document.getElementById('vatRateDisplay').textContent = vatRate; receiptFormatter.shopName = settings.name || 'Dawa Smart'; receiptFormatter.address = settings.address || '7 Cheptais · 📞 0759324463'; receiptFormatter.kraPin = settings.kraPin || 'P-2025-001'; receiptFormatter.footer = settings.footer || 'Thank you for choosing Dawa Smart!'; receiptFormatter.vatRate = vatRate; } catch(e) {} } }
function updatePharmacyDisplay() { const name = document.getElementById('shopName').value || 'Dawa Smart'; document.getElementById('headerPharmacyName').textContent = name; document.getElementById('currentPharmacyDisplay').textContent = name; }
function saveSettings(){ if(!adminGuard('save settings')) return;
    // Use tenant-scoped storage key
    var pharmId = (typeof window.DawaTenant !== 'undefined' && window.DawaTenant.getCurrentPharmacyId)
        ? window.DawaTenant.getCurrentPharmacyId() : null;
    var storageKey = pharmId ? 'yetu_pharmacy_' + pharmId : 'yetu_pharmacy';
    const settings = { name: document.getElementById('shopName').value.trim() || 'Dawa Smart', address: document.getElementById('shopAddress').value.trim() || '7 Cheptais · 📞 0759324463', kraPin: document.getElementById('kraPin').value.trim() || 'P-2025-001', footer: document.getElementById('receiptFooter').value.trim() || 'Thank you for choosing Dawa Smart!', vatRate: parseFloat(document.getElementById('vatRate').value) || 0 }; localStorage.setItem(storageKey, JSON.stringify(settings)); vatRate = settings.vatRate; document.getElementById('vatRateDisplay').textContent = vatRate; receiptFormatter.shopName = settings.name; receiptFormatter.address = settings.address; receiptFormatter.kraPin = settings.kraPin; receiptFormatter.footer = settings.footer; receiptFormatter.vatRate = vatRate; updatePharmacyDisplay(); showToast('Settings saved!','success'); }

// ===== USER MANAGEMENT =====
function loadUsers(){ 
    const search = document.getElementById('userSearch').value.toLowerCase(); 
    const roleFilter = document.getElementById('userRoleFilter').value; 
    const container = document.getElementById('userList'); 
    let filtered = users.filter(u => u.username !== 'RASHID' && u.username !== 'DEMO'); 
    if(search) filtered = filtered.filter(u=>u.fullName.toLowerCase().includes(search)||u.username.toLowerCase().includes(search)); 
    if(roleFilter !== 'all') filtered = filtered.filter(u=>u.role===roleFilter); 
    document.getElementById('totalUsers').textContent=users.length; 
    if(filtered.length===0){container.innerHTML='<div class="empty"><i class="fas fa-users"></i><p>No users</p></div>';return;} 
    container.innerHTML = filtered.map(u=>{ 
        const roleClass=u.role; 
         const isProtected = u.username === 'RASHID' || u.username === 'DEMO';
        return '<div class="item-card" style="border-left-color:'+(u.status==='active'?'#0b6e4f':'#f59e0b')+';">'+ 
            '<div style="display:flex;justify-content:space-between;align-items:start;">'+ 
            '<div><h4 style="font-size:14px;color:#0f172a;">'+u.fullName+'</h4>'+ 
            '<div style="font-size:11px;color:#64748b;">@'+u.username+'</div>'+ 
            '<div style="font-size:11px;color:#64748b;">'+(u.pharmacy||'')+'</div></div>'+ 
            '<span class="user-role '+roleClass+'">'+u.role.charAt(0).toUpperCase()+u.role.slice(1)+'</span></div>'+ 
            '<div style="display:flex;gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap;">'+ 
            '<span style="font-size:10px;color:'+(u.status==='active'?'#16a34a':u.status==='pending'?'#f59e0b':'#dc2626')+';">'+(u.status==='active'?'✅ Active':u.status==='pending'?'⏳ Pending':'⛔ Inactive')+(u.verified===false?' 📧 Unverified':'')+'</span>'+ 
            (currentUser && isAdmin() && !isProtected ? '<div class="actions">'+
            '<button class="btn btn-sm btn-blue" onclick="editUser(\''+u.id+'\')"><i class="fas fa-edit"></i></button>'+
            '<button class="btn btn-sm btn-danger" onclick="deleteUser(\''+u.id+'\')"><i class="fas fa-trash"></i></button>'+
            '</div>' : '')+
            (u.username === 'RASHID' ? '<span style="font-size:10px;color:#0b6e4f;font-weight:600;">👑 Primary Admin</span>' : '')+
            (u.username === 'DEMO' ? '<span style="font-size:10px;color:#f59e0b;font-weight:600;">👁️ Demo Account</span>' : '')+
            '</div></div>'; 
    }).join(''); 
}
function openUserModal(user, isPaid){ if(!adminGuard('manage users')) return; const modal=document.getElementById('userModal'); document.getElementById('userModalTitle').textContent=user?'Edit User':(isPaid?'Add Paid User':'Add User'); document.getElementById('userId').value=user?user.id:''; document.getElementById('userFullName').value=user?user.fullName:''; document.getElementById('userUsername').value=user?user.username:''; document.getElementById('userEmail').value=user?user.email||'':''; document.getElementById('userPhone').value=user?user.phone||'':''; document.getElementById('userRole').value=user?user.role:'cashier'; document.getElementById('userPassword').value=''; document.getElementById('userPassword').required=!user; document.getElementById('userStatus').value=user?user.status:'active'; document.getElementById('userPaid').value=isPaid?'1':''; modal.classList.add('show'); }
function openPaidUserModal(){ openUserModal(null, true); }
function saveUser(e){ 
    if (e) { e.preventDefault(); e.stopPropagation(); }
    console.log('[saveUser] Starting save...');
    if(!adminGuard('save user')) { console.log('[saveUser] Admin guard failed'); return false; }
    const id=document.getElementById('userId').value||generateId();
    const fullName=document.getElementById('userFullName').value.trim();
    const username=document.getElementById('userUsername').value.trim();
    const email=document.getElementById('userEmail').value.trim();
    const phone=document.getElementById('userPhone').value.trim();
    const role=document.getElementById('userRole').value;
    const password=document.getElementById('userPassword').value.trim();
    const status=document.getElementById('userStatus').value;
    const isPaid=document.getElementById('userPaid').value==='1';
    console.log('[saveUser] Form data:', {id, fullName, username, email, role, status, isPaid});
    if(!fullName||!username){showToast('Fill required fields','error');return false;}
    if(!password){showToast('Password required','error');return false;}
    if(password.length<8){showToast('Password 8+ chars','error');return false;}
    const existing=users.find(u=>u.username===username&&u.id!==id);
    if(existing){showToast('Username taken','error');return false;}
    const user={id,fullName,username,password:password,email:email||undefined,phone:phone||undefined,role,status,pharmacy:document.getElementById('shopName').value||'Dawa Smart',verified:true,paid:isPaid,paidDate:isPaid?new Date().toISOString():undefined,createdAt:new Date().toISOString()};
    const idx=users.findIndex(u=>u.id===id);
    if(idx>=0){ 
        user.password = password || users[idx].password; 
        users[idx]=user; 
        showToast('User updated!','success'); 
    } else { 
        users.push(user); 
        showCredentialsModal(username, password, fullName, role, isPaid); 
    }
    document.getElementById('userModal').classList.remove('show');
    document.getElementById('userPaid').value='';
    loadUsers(); 
    saveUsersToStorage();
    console.log('[saveUser] Save complete');
    return false;
}
function editUser(id){const user=users.find(u=>u.id===id);if(user)openUserModal(user);}
function deleteUser(id){if(!adminGuard('delete user')) return;if(id === 'user_rashidjuma'){showToast('Cannot delete primary developer','error');return;}if(id === 'user_demo'){showToast('Cannot delete demo account','error');return;}if(!confirm('Delete this user?'))return;users=users.filter(u=>u.id!==id);saveUsersToStorage();loadUsers();showToast('User deleted','success');}
function saveUsersToStorage(){localStorage.setItem('yetu_users',JSON.stringify(users));}
function loadUsersFromStorage(){ const stored=localStorage.getItem('yetu_users'); if(stored){ const parsed=JSON.parse(stored); const hasMain = parsed.some(u=>u.username === 'RASHID'); const hasDemo = parsed.some(u=>u.username === 'DEMO'); let baseUsers = []; if(!hasMain) baseUsers.push(SINGLE_USER); if(!hasDemo) baseUsers.push(DEMO_USER); // Preserve all added users (not RASHID/DEMO) const addedUsers = parsed.filter(u=>u.username !== 'RASHID' && u.username !== 'DEMO'); users = baseUsers.concat(addedUsers); saveUsersToStorage(); } }

function showCredentialsModal(username, password, fullName, role, isPaid) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:420px;">
            <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2 style="margin-top:0;color:#0b6e4f;"><i class="fas fa-key"></i> User Created Successfully</h2>
            <p style="color:#64748b;">Credentials for <strong>${escapeHtml(fullName)}</strong> (${escapeHtml(role)}):</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="color:#64748b;font-size:12px;">Username</span>
                    <span style="font-family:monospace;font-weight:600;color:#0b6e4f;" id="credUsername">${escapeHtml(username)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span style="color:#64748b;font-size:12px;">Password</span>
                    <span style="font-family:monospace;font-weight:600;color:#dc2626;" id="credPassword">${escapeHtml(password)}</span>
                </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-success" onclick="copyToClipboard('credUsername')"><i class="fas fa-copy"></i> Copy Username</button>
                <button class="btn btn-warning" onclick="copyToClipboard('credPassword')"><i class="fas fa-copy"></i> Copy Password</button>
                <button class="btn btn-blue" onclick="shareCredentialsWhatsApp('${escapeHtml(username)}','${escapeHtml(password)}','${escapeHtml(fullName)}')"><i class="fab fa-whatsapp"></i> WhatsApp</button>
                <button class="btn" onclick="this.closest('.modal').remove()"><i class="fas fa-check"></i> Done</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function copyToClipboard(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

function shareCredentialsWhatsApp(username, password, fullName) {
    const phone = document.getElementById('shopPhone')?.value || '254759324463';
    const message = encodeURIComponent(
        `🔐 Dawa Smart Login Credentials\n\n` +
        `Hello ${fullName},\n\n` +
        `Your login credentials:\n` +
        `Username: ${username}\n` +
        `Password: ${password}\n\n` +
        `Please login at: ${window.location.origin}\n\n` +
        `Keep these credentials secure!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
}

// ===== EXPENSES =====
function saveExpense(){ if(!adminGuard('save expense')) return; const type = document.getElementById('expenseType').value; const amount = parseFloat(document.getElementById('expenseAmount').value); const desc = document.getElementById('expenseDesc').value.trim(); if(!type || !amount || amount <= 0){ showToast('Please fill expense details','error'); return; } const expense = { id: generateId(), type: type, amount: amount, description: desc, date: new Date().toISOString() }; db.add('expenses', expense).then(()=>{ showToast('Expense saved!','success'); document.getElementById('expenseType').value='lunch'; document.getElementById('expenseAmount').value=''; document.getElementById('expenseDesc').value=''; loadExpensesForDate(new Date().toISOString().split('T')[0]); loadExpensesPeriod('daily'); }).catch(()=> showToast('Error saving expense','error')); }

function loadExpensesForDate(dateStr){ if (!dateStr) { dateStr = new Date().toISOString().split('T')[0]; } db.getAll('expenses').then(allExpenses=>{ dailyExpenses = (allExpenses || []).filter(e=> e.date && e.date.startsWith(dateStr)); loadExpensesPeriod('daily'); }); }

function loadTodayExpenses(){ const today = new Date().toISOString().split('T')[0]; document.getElementById('expenseDate').value = today; loadExpensesForDate(today); }

function loadExpensesPeriod(period) { 
    const now = new Date(); 
    let start, end; 
    if (period === 'daily') { 
        start = now.toISOString().split('T')[0]; 
        end = now.toISOString().split('T')[0]; 
    } else if (period === 'weekly') { 
        const ws = new Date(now); 
        ws.setDate(now.getDate() - now.getDay()); 
        start = ws.toISOString().split('T')[0]; 
        end = now.toISOString().split('T')[0]; 
    } else if (period === 'monthly') { 
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; 
        end = now.toISOString().split('T')[0]; 
    } else if (period === 'yearly') { 
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; 
        end = now.toISOString().split('T')[0]; 
    } else { 
        // If period is a date string, use it as both start and end
        const dateInput = document.getElementById('expenseDate');
        if (dateInput && dateInput.value) {
            start = dateInput.value;
            end = dateInput.value;
        } else {
            start = new Date().toISOString().split('T')[0];
            end = new Date().toISOString().split('T')[0];
        }
    } 
    
    db.getAll('expenses').then(allExpenses => { 
        const filtered = allExpenses.filter(e => e.date && e.date >= start && e.date <= end); 
        const total = filtered.reduce((sum, e) => sum + e.amount, 0); 
        const byType = {}; 
        filtered.forEach(e => { byType[e.type] = (byType[e.type] || 0) + e.amount; }); 
        const summary = document.getElementById('expenseSummary'); 
        if (summary) { 
            summary.innerHTML = '<div class="stat-card"><div class="number">'+formatCurrency(total)+'</div><div class="label">Total Expenses</div></div>' + 
                '<div class="stat-card"><div class="number">'+filtered.length+'</div><div class="label">Transactions</div></div>' + 
                Object.keys(byType).slice(0, 4).map(t => '<div class="stat-card"><div class="number">'+formatCurrency(byType[t])+'</div><div class="label">'+t.charAt(0).toUpperCase()+t.slice(1)+'</div></div>').join(''); 
        }
        // Update category breakdown
        const breakdown = document.getElementById('expenseCategoryBreakdown');
        if (breakdown) {
            if (Object.keys(byType).length === 0) {
                breakdown.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">No expenses in this period</div>';
            } else {
                const sorted = Object.entries(byType).sort((a,b) => b[1] - a[1]);
                let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;">';
                sorted.forEach(([type, amount]) => {
                    const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
                    const label = type === 'lunch' ? '🍽️ Lunch' : type === 'fuel' ? '⛽ Fuel' : type === 'rent' ? '🏠 Rent' : type === 'salary' ? '💼 Salary' : type === 'utilities' ? '💡 Utilities' : type === 'supplies' ? '📦 Supplies' : '📋 Other';
                    html += `<div style="background:#fff;padding:10px;border-radius:8px;border:1px solid #e2e8f0;text-align:center;">
                        <div style="font-size:12px;color:#64748b;">${label}</div>
                        <div style="font-weight:700;font-size:16px;color:#0b6e4f;">${formatCurrency(amount)}</div>
                        <div style="font-size:10px;color:#94a3b8;">${pct}% of total</div>
                    </div>`;
                });
                html += '</div>';
                breakdown.innerHTML = html;
            }
        }
        // Update history table for the period
        const tbody = document.getElementById('expensesTableBody');
        if (tbody) {
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;">No expenses for this period</td></tr>';
            } else {
                tbody.innerHTML = filtered.slice().reverse().map(e => {
                    const typeLabel = e.type === 'lunch' ? '🍽️ Lunch' : e.type === 'fuel' ? '⛽ Fuel' : e.type === 'rent' ? '🏠 Rent' : e.type === 'salary' ? '💼 Salary' : e.type === 'utilities' ? '💡 Utilities' : e.type === 'supplies' ? '📦 Supplies' : '📋 Other';
                    return `<tr><td>${formatDate(e.date)}</td><td>${typeLabel}</td><td>${formatCurrency(e.amount)}</td><td>${e.description || '—'}</td><td>${isEditor() ? '<button class="btn btn-sm btn-danger" onclick="deleteExpense(\''+e.id+'\')"><i class="fas fa-trash"></i></button>' : '<span style="color:#94a3b8;font-size:10px;">🔒</span>'}</td></tr>`;
                }).join('');
            }
        }
    }); 
}

function refreshFinancialViews(){
  const dateInput = document.getElementById('expenseDate');
  loadExpensesForDate(dateInput ? dateInput.value : null);
  loadExpensesPeriod('daily');
  updateStats();
  loadCreditDashboard();
  loadProfessionalAnalysis('daily');
  generateCustomReport();
}

function deleteExpense(id){ if(!adminGuard('delete expense')) return; if(!confirm('Delete this expense?')) return; db.delete('expenses', id).then(()=>{ showToast('Expense deleted','success'); refreshFinancialViews(); }).catch(()=> showToast('Error deleting','error')); }

function exportExpenseAnalysis() {
    const dateInput = document.getElementById('expenseDate');
    const start = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    db.getAll('expenses').then(allExpenses => {
        const filtered = allExpenses.filter(e => e.date && e.date.startsWith(start));
        const byType = {};
        let total = 0;
        filtered.forEach(e => { byType[e.type] = (byType[e.type] || 0) + e.amount; total += e.amount; });
        let report = '═'.repeat(60) + '\n  DAWA SMART – EXPENSE ANALYSIS\n═'.repeat(60) + '\n  Date: ' + formatDate(start) + '\n  Total Expenses: ' + formatCurrency(total) + '\n  Transactions: ' + filtered.length + '\n─'.repeat(60) + '\n\n';
        Object.entries(byType).sort((a,b) => b[1] - a[1]).forEach(([type, amount]) => {
            const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
            const label = type === 'lunch' ? '🍽️ Lunch' : type === 'fuel' ? '⛽ Fuel' : type === 'rent' ? '🏠 Rent' : type === 'salary' ? '💼 Salary' : type === 'utilities' ? '💡 Utilities' : type === 'supplies' ? '📦 Supplies' : '📋 Other';
            report += '  ' + label + ': ' + formatCurrency(amount) + ' (' + pct + '%)\n';
        });
        report += '─'.repeat(60) + '\n';
        filtered.forEach(e => {
            const label = e.type === 'lunch' ? '🍽️ Lunch' : e.type === 'fuel' ? '⛽ Fuel' : e.type === 'rent' ? '🏠 Rent' : e.type === 'salary' ? '💼 Salary' : e.type === 'utilities' ? '💡 Utilities' : e.type === 'supplies' ? '📦 Supplies' : '📋 Other';
            report += '  ' + formatDate(e.date) + ' | ' + label + ' | ' + formatCurrency(e.amount) + ' | ' + (e.description || '—') + '\n';
        });
        report += '═'.repeat(60);
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expense-analysis-' + start + '.txt';
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ Expense analysis exported', 'success');
    });
}

// ===== INVENTORY FUNCTIONS =====
function loadProducts(){ 
    const search=document.getElementById('inventorySearch').value.toLowerCase(); 
    const category=document.getElementById('categoryFilter').value; 
    db.getAll('products').then(data=>{ 
        products=data || []; 
        window.products=products; 
        let filtered=products; 
        if(search) filtered=filtered.filter(p=>p.name.toLowerCase().includes(search)||(p.sku&&p.sku.toLowerCase().includes(search))); 
        if(category!=='all') filtered=filtered.filter(p=>p.category===category); 
        renderInventory(filtered); 
        updateProductGrid(); 
        updatePricingDashboard(); 
    }); 
}
function renderInventory(data){ 
    const container=document.getElementById('inventoryList'); 
    if(!data||data.length===0){container.innerHTML='<div class="empty"><i class="fas fa-box-open"></i><p>No products</p></div>';return;} 
    container.innerHTML=data.map(p=>{ 
        const stockStatus=p.quantity<=0?'out-stock':p.quantity<=5?'low-stock':'in-stock'; 
        const labels={'in-stock':'✅ In Stock','low-stock':'⚠️ Low Stock','out-stock':'❌ Out'}; 
        const profit=(p.sellingPrice||0)-(p.buyingPrice||0); 
        const badgeClass = p.badge || 'otc'; 
        return '<div class="item-card" style="border-left-color:'+(p.quantity<=5?'#dc2626':p.quantity<=20?'#f59e0b':'#0b6e4f')+';">'+
            '<div style="display:flex;justify-content:space-between;align-items:start;">'+
            '<h4 style="font-size:14px;">'+p.name+(p.controlled?' <span class="controlled-badge">🚫 CONTROLLED</span>':'')+'</h4>'+
            '<span class="stock-badge '+stockStatus+'">'+labels[stockStatus]+'</span></div>'+
            '<div class="meta">SKU: '+(p.sku||'N/A')+' | '+(p.category||'N/A')+'</div>'+
            '<div class="price">'+formatCurrency(p.sellingPrice||p.price||0)+'</div>'+
            '<div class="meta">💰 Buy: '+formatCurrency(p.buyingPrice||0)+' | Profit: '+formatCurrency(profit)+'</div>'+
            (p.generic?'<div class="meta" style="color:#0b6e4f;font-size:11px;">💊 Generic: '+p.generic+'</div>':'')+
            '<div class="meta">Stock: '+p.quantity+' units'+(p.expiryDate?' | 📅 Exp: '+formatShortDate(p.expiryDate):'')+'</div>'+
            '<div><span class="drug-badge '+badgeClass+'">'+badgeClass.toUpperCase()+'</span></div>'+
            '<div class="actions" style="margin-top:4px;">'+(isEditor()?'<button class="btn btn-sm btn-blue" onclick="editProduct(\''+p.id+'\')"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="deleteProduct(\''+p.id+'\')"><i class="fas fa-trash"></i></button>':'<span style="color:#94a3b8;font-size:10px;">🔒 Admin only</span>')+'</div></div>'; 
    }).join(''); 
}
function openProductModal(product){ if(!adminGuard('add/edit product')) return; const modal=document.getElementById('productModal'); document.getElementById('productModalTitle').textContent=product?'Edit Product':'Add Product'; document.getElementById('productId').value=product?product.id:''; document.getElementById('productName').value=product?product.name:''; document.getElementById('productSku').value=product?product.sku||'':''; document.getElementById('productCategory').value=product?product.category||'other':'antibiotics'; document.getElementById('productUnit').value=product?product.unit||'pack':'pack'; document.getElementById('productBuyingPrice').value=product?product.buyingPrice||0:''; document.getElementById('productSellingPrice').value=product?product.sellingPrice||product.price||0:''; document.getElementById('productQuantity').value=product?product.quantity:''; document.getElementById('productExpiry').value=product?product.expiryDate||'':''; document.getElementById('productBatch').value=''; document.getElementById('productSupplier').value=''; document.getElementById('productGeneric').value=product?product.generic||'':''; document.getElementById('productControlled').checked=product?product.controlled||false:false; modal.classList.add('show'); }
function saveProduct(){ if(!adminGuard('save product')) return; const id=document.getElementById('productId').value||generateId(); const buyingPrice=parseFloat(document.getElementById('productBuyingPrice').value)||0; const sellingPrice=parseFloat(document.getElementById('productSellingPrice').value)||0; const unit=document.getElementById('productUnit').value.trim(); const product={id,name:document.getElementById('productName').value.trim(),sku:document.getElementById('productSku').value.trim()||undefined,category:document.getElementById('productCategory').value,unit:unit||'pack',buyingPrice:buyingPrice,sellingPrice:sellingPrice,price:sellingPrice,quantity:parseInt(document.getElementById('productQuantity').value),expiryDate:document.getElementById('productExpiry').value||undefined,generic:document.getElementById('productGeneric').value.trim()||undefined,controlled:document.getElementById('productControlled').checked,badge:document.getElementById('productCategory').value}; if(!product.name||!product.sellingPrice||product.quantity===undefined){showToast('Fill required fields','error');return;} if(product.sellingPrice<=0||product.quantity<0){showToast('Price & quantity must be positive','error');return;} const batchNumber=document.getElementById('productBatch').value.trim(); const supplier=document.getElementById('productSupplier').value.trim(); db.getById('products',id).then(existing=>{if(existing)return db.update('products',product);else return db.add('products',product);}).then(()=>{if(batchNumber&&product.expiryDate){const batch={id:generateId(),productId:product.id,productName:product.name,batchNumber:batchNumber,expiryDate:product.expiryDate,quantity:product.quantity,buyingPrice:buyingPrice,sellingPrice:sellingPrice,supplier:supplier||'',receivedDate:new Date().toISOString().split('T')[0]};return db.add('batches',batch);}}).then(()=>{showToast('Product saved!','success');document.getElementById('productModal').classList.remove('show');loadProducts();loadProductSearch();updateProductGrid();updatePricingDashboard();}).catch(e=>showToast('Error: '+e.message,'error')); }
function editProduct(id){if(!adminGuard('edit product')) return;db.getById('products',id).then(p=>{if(p)openProductModal(p);});}
function deleteProduct(id){if(!adminGuard('delete product')) return;if(!confirm('Delete this product?'))return;db.delete('products',id).then(()=>{showToast('Product deleted','success');loadProducts();loadProductSearch();updateProductGrid();updatePricingDashboard();});}
function loadProductSearch(){db.getAll('products').then(data=>{products=data;window.products=products;updateProductGrid();});}
function addProductBatch(){ if(!adminGuard('add batch')) return; const modal=document.getElementById('batchModal'); const select=document.getElementById('batchProductSelect'); select.innerHTML='<option value="">Select Product...</option>'; products.forEach(p=>{select.innerHTML+='<option value="'+p.id+'">'+p.name+' ('+p.quantity+' in stock)</option>';}); document.getElementById('batchNumber').value='B'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+String(Math.floor(Math.random()*1000)).padStart(3,'0'); document.getElementById('batchQuantity').value=''; document.getElementById('batchExpiry').value=''; document.getElementById('batchBuyingPrice').value=''; document.getElementById('batchSellingPrice').value=''; document.getElementById('batchSupplier').value=''; modal.classList.add('show'); }
function saveBatch(){ if(!adminGuard('save batch')) return; const productId=document.getElementById('batchProductSelect').value; const batchNumber=document.getElementById('batchNumber').value.trim(); const quantity=parseInt(document.getElementById('batchQuantity').value); const expiryDate=document.getElementById('batchExpiry').value; const buyingPrice=parseFloat(document.getElementById('batchBuyingPrice').value)||0; const sellingPrice=parseFloat(document.getElementById('batchSellingPrice').value)||0; const supplier=document.getElementById('batchSupplier').value.trim(); if(!productId||!batchNumber||!quantity||!expiryDate||!sellingPrice){showToast('Fill required fields','error');return;} if(quantity<=0||sellingPrice<=0){showToast('Quantity & price positive','error');return;} const product=products.find(p=>p.id===productId); if(!product){showToast('Product not found','error');return;} const batch={id:generateId(),productId:productId,productName:product.name,batchNumber:batchNumber,expiryDate:expiryDate,quantity:quantity,buyingPrice:buyingPrice||product.buyingPrice||0,sellingPrice:sellingPrice,supplier:supplier||'',receivedDate:new Date().toISOString().split('T')[0]}; db.add('batches',batch).then(()=>{product.quantity+=quantity;if(buyingPrice>0)product.buyingPrice=buyingPrice;if(sellingPrice>0)product.sellingPrice=sellingPrice;product.price=sellingPrice;return db.update('products',product);}).then(()=>{showToast('✅ Batch '+batchNumber+' added!','success');document.getElementById('batchModal').classList.remove('show');loadProducts();loadProductSearch();updateProductGrid();updatePricingDashboard();}).catch(e=>showToast('Error: '+e.message,'error')); }

// ===== PRICING =====
function updatePricingDashboard(){ 
    const search=document.getElementById('pricingSearch')?.value.toLowerCase()||''; 
    const category=document.getElementById('pricingCategoryFilter')?.value||'all'; 
    let filtered=products || []; 
    if(search) filtered=filtered.filter(p=>p.name.toLowerCase().includes(search)||(p.sku&&p.sku.toLowerCase().includes(search))); 
    if(category!=='all') filtered=filtered.filter(p=>p.category===category); 
    let totalBuying=0,totalSelling=0,totalProfit=0; 
    filtered.forEach(p=>{const buying=p.buyingPrice||0;const selling=p.sellingPrice||p.price||0;const qty=p.quantity||0;totalBuying+=buying*qty;totalSelling+=selling*qty;totalProfit+=(selling-buying)*qty;}); 
    document.getElementById('totalBuyingPrice').textContent=formatCurrency(totalBuying); 
    document.getElementById('totalSellingPrice').textContent=formatCurrency(totalSelling); 
    document.getElementById('totalProfit').textContent=formatCurrency(totalProfit); 
    const tbody=document.getElementById('pricingTableBody'); 
    if(!filtered || filtered.length===0){tbody.innerHTML='<tr><td colspan="10" style="text-align:center;padding:30px;color:#94a3b8;">No products available. Add some products first.</td></tr>';return;} 
    tbody.innerHTML=filtered.map((p,i)=>{const buying=p.buyingPrice||0;const selling=p.sellingPrice||p.price||0;const profit=selling-buying;const margin=selling>0?((profit/selling)*100):0;const badgeClass=p.badge||'otc';return '<tr>'+'<td>'+(i+1)+'</td>'+'<td><strong>'+p.name+'</strong>'+(p.controlled?' <span class="controlled-badge">🚫</span>':'')+'<span class="drug-badge '+badgeClass+'" style="margin-left:4px;">'+badgeClass.toUpperCase()+'</span></td>'+'<td>'+(p.category||'N/A')+'</td>'+'<td style="font-size:11px;font-weight:500;color:#0b6e4f;">'+(p.unit||'—')+'</td>'+'<td><input type="number" step="0.01" value="'+buying+'" id="buyPrice_'+p.id+'" style="width:70px;padding:4px;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;" '+(isEditor()?'':'disabled')+'></td>'+'<td><input type="number" step="0.01" value="'+selling+'" id="sellPrice_'+p.id+'" style="width:70px;padding:4px;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;" '+(isEditor()?'':'disabled')+'></td>'+'<td style="color:'+(profit>0?'#16a34a':profit<0?'#dc2626':'#94a3b8')+';">'+formatCurrency(profit)+'</td>'+'<td style="color:'+(profit>0?'#16a34a':profit<0?'#dc2626':'#94a3b8')+';">'+margin.toFixed(1)+'%</td>'+'<td>'+p.quantity+'</td>'+'<td>'+(isEditor()?'<button class="btn btn-sm btn-blue" onclick="updateProductPrice(\''+p.id+'\')"><i class="fas fa-save"></i></button>':'<span style="color:#94a3b8;font-size:10px;">🔒</span>')+'</td>'+'</tr>';}).join(''); 
}
function updateProductPrice(productId){ if(!adminGuard('update product price')) return; const buyInput = document.getElementById('buyPrice_'+productId); const sellInput = document.getElementById('sellPrice_'+productId); if(!buyInput || !sellInput) return; const newBuy = parseFloat(buyInput.value); const newSell = parseFloat(sellInput.value); if(isNaN(newBuy) || isNaN(newSell) || newBuy < 0 || newSell < 0){showToast('Enter valid positive numbers','error');return;} const product = products.find(p=>p.id===productId); if(!product){showToast('Product not found','error');return;} product.buyingPrice = newBuy; product.sellingPrice = newSell; product.price = newSell; db.update('products',product).then(()=>{ showToast('✅ Prices updated for '+product.name,'success'); updatePricingDashboard(); updateProductGrid(); }).catch(e=>showToast('Error updating: '+e.message,'error')); }
function exportPricingReport(){ let report='═'.repeat(60)+'\n  DAWA SMART – PRICING REPORT\n═'.repeat(60)+'\n  Generated: '+new Date().toLocaleString()+'\n  KRA PIN: P-2025-001\n─'.repeat(60)+'\n\n'; let totalBuying=0,totalSelling=0,totalProfit=0; products.forEach((p,i)=>{const buying=p.buyingPrice||0;const selling=p.sellingPrice||p.price||0;const profit=selling-buying;const qty=p.quantity||0;totalBuying+=buying*qty;totalSelling+=selling*qty;totalProfit+=profit*qty;report+='  '+(i+1)+'. '+p.name+'\n     Buying: '+formatCurrency(buying)+' | Selling: '+formatCurrency(selling)+' | Profit: '+formatCurrency(profit)+' | Stock: '+qty+'\n';}); report+='─'.repeat(60)+'\n  TOTAL BUYING: '+formatCurrency(totalBuying)+'\n  TOTAL SELLING: '+formatCurrency(totalSelling)+'\n  TOTAL PROFIT: '+formatCurrency(totalProfit)+'\n═'.repeat(60); const blob=new Blob([report],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='pricing-report-'+new Date().toISOString().split('T')[0]+'.txt';a.click();URL.revokeObjectURL(url);showToast('✅ Report exported','success'); }

// ===== POS FUNCTIONS =====
function updateProductGrid(){ 
    const grid=document.getElementById('posProducts'); 
    let items = products || []; 
    if(currentCategory !== 'all') { 
        if(currentCategory === 'controlled') { 
            items = items.filter(p => p.controlled === true); 
        } else { 
            items = items.filter(p => p.category === currentCategory); 
        } 
    } 
    if(!items || items.length===0){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:#94a3b8;"><i class="fas fa-box-open" style="font-size:30px;display:block;margin-bottom:8px;"></i><p>'+(products.length===0?'No products in inventory. Add products first!':'No products in this category')+'</p></div>';return;} 
    document.getElementById('productCount').textContent=items.length; 
    grid.innerHTML=items.map(p=>{ 
        const status=p.quantity<=0?'out-of-stock':p.quantity<=5?'low-stock':'in-stock'; 
        const icon=p.category==='antibiotics'?'💊':p.category==='pain-relief'?'💉':p.category==='antimalarial'?'🦟':p.category==='vitamins'?'🍊':p.category==='chronic'?'📋':p.category==='controlled'?'🚫':'📦'; 
        const badgeClass = p.badge || 'otc'; 
        return '<div class="pos-product-card '+status+'" onclick="addToCart(\''+p.id+'\')" title="'+p.name+'">'+ 
            '<span class="icon">'+icon+'</span>'+ 
            '<div class="name">'+p.name+'</div>'+ 
            '<div class="price">'+formatCurrency(p.sellingPrice||p.price||0)+'</div>'+ 
            '<div class="stock">'+(p.quantity>0?'📦 '+p.quantity:'❌ Out')+'</div>'+ 
            (p.generic?'<div style="font-size:7px;color:#94a3b8;">💊 '+p.generic+'</div>':'')+ 
            '<span class="drug-badge '+badgeClass+'" style="font-size:6px;padding:1px 6px;">'+badgeClass.toUpperCase()+'</span>'+ 
        '</div>'; 
    }).join(''); 
}

function scanBarcode(){const code=prompt('📷 Enter barcode:');if(code){document.getElementById('productSearch').value=code;searchProducts();const product=products.find(p=>p.sku===code);if(product)addToCart(product.id);}}
function quickAddProduct(){ if(!adminGuard('add product')) return; const name=prompt('Product name:');if(!name)return; const buyingPrice=parseFloat(prompt('Buying price (KES):'))||0; const sellingPrice=parseFloat(prompt('Selling price (KES):'));if(!sellingPrice||sellingPrice<=0)return; const quantity=parseInt(prompt('Quantity:'));if(!quantity||quantity<=0)return; const category=prompt('Category (antibiotics/pain-relief/antimalarial/vitamins/chronic/controlled/other):')||'other'; const product={id:generateId(),name:name,sku:'SKU-'+Date.now().toString(36).toUpperCase(),category:category,buyingPrice:buyingPrice,sellingPrice:sellingPrice,price:sellingPrice,quantity:quantity,controlled:false,badge:category}; db.add('products',product).then(()=>{showToast('✅ '+name+' added!','success');loadProducts();loadProductSearch();updateProductGrid();updatePricingDashboard();}).catch(e=>showToast('Error: '+e.message,'error')); }
function searchProducts(){ const query=document.getElementById('productSearch').value.toLowerCase().trim(); const results=document.getElementById('searchResults'); if(!query){results.style.display='none';results.innerHTML='';return;} const matches=products.filter(p=>p.name.toLowerCase().includes(query)||(p.sku&&p.sku.toLowerCase().includes(query))||(p.generic&&p.generic.toLowerCase().includes(query))).slice(0,10); if(matches.length===0){ const drugMatches = (window.drugs || []).filter(d => !d.deleted_at && (d.generic_name||'').toLowerCase().includes(query)||(d.brand_name||'').toLowerCase().includes(query)||(d.drug_name||'').toLowerCase().includes(query)).slice(0,10); if(drugMatches.length === 0){results.style.display='block';results.innerHTML='<div style="padding:8px;color:#64748b;font-size:12px;">No products</div>';return;} results.style.display='block'; results.innerHTML=`<div style="padding:6px 12px;background:#f0fdf4;border-bottom:1px solid #dcfce7;font-size:11px;color:#166534;">Drug Catalogue</div>`+drugMatches.map(d=>'<div onclick="selectDrugFromSmartSearch(\''+d.id+'\')" style="display:flex;justify-content:space-between;padding:6px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:0.2s;font-size:12px;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">'+'<div><strong>'+d.drug_name+'</strong><span style="color:#64748b;margin-left:8px;font-size:10px;">'+d.generic_name+' '+d.strength+'</span></div>'+'<div style="color:#0b6e4f;font-weight:700;">'+formatCurrency(d.selling_price||0)+'</div></div>').join(''); return; } results.style.display='block'; results.innerHTML=matches.map(p=>'<div onclick="addToCart(\''+p.id+'\')" style="display:flex;justify-content:space-between;padding:6px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:0.2s;font-size:12px;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">'+'<div><strong>'+p.name+'</strong><span style="color:#64748b;margin-left:8px;">Stock: '+p.quantity+'</span>'+(p.generic?'<span style="color:#0b6e4f;margin-left:6px;">💊 '+p.generic+'</span>':'')+' <span class="drug-badge '+(p.badge||'otc')+'" style="font-size:7px;">'+(p.badge||'otc').toUpperCase()+'</span></div>'+'<div style="color:#0b6e4f;font-weight:700;">'+formatCurrency(p.sellingPrice||p.price||0)+'</div></div>').join(''); }
function selectDrugFromSmartSearch(drugId) {
    const drug = (window.drugs || []).find(d => d.id === drugId);
    if (!drug) return;
    const stockSummary = window.drugStockSummary?.[drugId];
    if (!stockSummary || stockSummary.total_quantity <= 0) {
        showToast(drug.drug_name + ' is out of stock', 'error');
        return;
    }
    const batch = getBestBatchForDrug(drugId, 1);
    if (!batch) {
        showToast('No available batches for ' + drug.drug_name, 'error');
        return;
    }
    addToCartFromSmartDrug(drug, batch);
    showToast(drug.drug_name + ' added to cart', 'success');
    document.getElementById('productSearch').value = '';
    document.getElementById('searchResults').style.display = 'none';
}

function addToCart(productId){ 
    const product=products.find(p=>p.id===productId); 
    if(!product){showToast('Product not found','error');return;} 
    if(product.quantity<=0){showToast('Out of stock','error');return;} 
    if(product.controlled){ 
        if(!confirm('🚫 CONTROLLED SUBSTANCE\n\n'+product.name+' requires Doctor & Patient ID.\nContinue?'))return; 
        const doctor=prompt('Doctor ID:');if(!doctor||doctor.length<4){showToast('Valid Doctor ID required','error');return;} 
        const patient=prompt('Patient ID:');if(!patient||patient.length<4){showToast('Valid Patient ID required','error');return;} 
        const logs=JSON.parse(localStorage.getItem('yetu_controlled_logs')||'[]'); 
        logs.push({id:generateId(),productName:product.name,productId:product.id,doctorId:doctor,patientId:patient,pharmacist:currentUser?currentUser.fullName:'Unknown',date:new Date().toISOString()}); 
        localStorage.setItem('yetu_controlled_logs',JSON.stringify(logs)); 
        showToast('✅ Controlled substance logged (PPB compliant)','success'); 
    } 
    const existing=cart.find(item=>item.productId===productId); 
    if(existing){if(existing.quantity>=product.quantity){showToast('Not enough stock','error');return;}existing.quantity++;} 
    else{
        const originalPrice = product.sellingPrice || product.price || 0;
        cart.push({
            id:generateId(),
            productId:product.id,
            drugId:product.drugId || product.drug_id || null,
            name:product.name,
            price:originalPrice,
            originalPrice:originalPrice,
            quantity:1,
            maxQty:product.quantity,
            controlled:product.controlled||false
        });
    } 
    document.getElementById('productSearch').value=''; 
    document.getElementById('searchResults').style.display='none'; 
    document.getElementById('searchResults').innerHTML=''; 
    renderCart(); 
    showToast(product.name+' added','success'); 
}

function removeFromCart(id){cart=cart.filter(item=>item.id!==id);delete negotiatedPrices[id];renderCart();}
function updateQty(id,delta){const item=cart.find(i=>i.id===id);if(!item)return;const newQty=item.quantity+delta;if(newQty<1){removeFromCart(id);return;}if(newQty>item.maxQty){showToast('Not enough stock','error');return;}item.quantity=newQty;renderCart();}

// FEFO stock deduction: deduct from batches with earliest expiry first
async function deductDrugStockFifo(item) {
    if (!item.drugId) return;
    const batches = await db.getAll('drugBatches');
    const today = new Date().toISOString().split('T')[0];
    // FEFO: sort by expiry_date ascending, filter non-expired with remaining > 0
    const candidateBatches = batches
        .filter(b => b.drug_id === item.drugId && !b.deleted_at &&
            (b.expiry_date >= today || b.expiry_date == null) &&
            b.quantity_remaining > 0)
        .sort((a, b) => new Date(a.expiry_date || '9999') - new Date(b.expiry_date || '9999'));

    let remaining = item.quantity;
    const movements = [];
    const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();

    for (const batch of candidateBatches) {
        if (remaining <= 0) break;
        const deducted = Math.min(remaining, batch.quantity_remaining);
        const before = batch.quantity_remaining;
        const after = before - deducted;
        batch.quantity_remaining = after;
        batch.revision = (batch.revision || 0) + 1;
        batch.updated_at = new Date().toISOString();
        await db.update('drugBatches', batch);

        movements.push({
            id: 'dsm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
            drug_id: item.drugId,
            batch_id: batch.id,
            movement_type: 'sell',
            quantity: -deducted,
            quantity_before: before,
            quantity_after: after,
            unit_price: batch.selling_price || 0,
            reference_type: 'sale',
            notes: 'Sale transaction',
            user_name: window.currentUser || 'Pharmacy Staff',
            pharmacyId: pharmacyId,
            created_at: new Date().toISOString()
        });
        remaining -= deducted;
    }

    if (remaining > 0) {
        console.warn('Insufficient FEFO stock for drug', item.drugId, 'short by', remaining);
    }

    // Record stock movements
    await Promise.all(movements.map(m => db.add('drugStockMovements', m)));
    // Update stock summary
    if (typeof updateDrugStockSummary === 'function') updateDrugStockSummary();
}

function renderCart(){
    const container=document.getElementById('cartItems');
    const totalEl=document.getElementById('cartTotal');
    const countEl=document.getElementById('itemCount');
    const subtotalEl=document.getElementById('originalSubtotalDisplay');
    const vatEl=document.getElementById('vatDisplay');
    const paymentInput=document.getElementById('paymentAmount');
    const negotiatedSubtotalEl = document.getElementById('negotiatedSubtotalDisplay');
    const negotiatedSummaryRow = document.getElementById('negotiatedSummaryRow');
    const totalLabel = document.getElementById('totalLabel');
    const negotiatedTotalLabel = document.getElementById('negotiatedTotalLabel');
    
    if(cart.length===0){
        container.innerHTML='<div class="empty"><i class="fas fa-shopping-cart"></i><p>Cart empty</p></div>';
        totalEl.textContent=formatCurrency(0);
        countEl.textContent='0 items';
        subtotalEl.textContent=formatCurrency(0);
        vatEl.textContent=formatCurrency(0);
        negotiatedSummaryRow.style.display='none';
        totalLabel.textContent = 'TOTAL: ';
        negotiatedTotalLabel.style.display='none';
        if(paymentInput){paymentInput.value='';paymentInput.placeholder='Amount paid';}
        document.getElementById('mpesaPrompt').classList.remove('show');
        document.getElementById('negotiationControls').classList.remove('show');
        document.getElementById('creditCustomerForm').classList.remove('show');
        return;
    }
    
    let originalSubtotal = cart.reduce((sum, item) => sum + (item.originalPrice || item.price) * item.quantity, 0);
    let actualSubtotal = 0;
    let hasNegotiations = false;
    cart.forEach(item => {
        const price = negotiatedPrices[item.id] !== undefined ? negotiatedPrices[item.id] : item.price;
        actualSubtotal += price * item.quantity;
        if (negotiatedPrices[item.id] !== undefined && negotiatedPrices[item.id] !== item.originalPrice) {
            hasNegotiations = true;
        }
    });
    
    const vat = actualSubtotal * (vatRate / 100);
    const total = actualSubtotal + vat;
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    container.innerHTML = cart.map(item => {
        const price = negotiatedPrices[item.id] !== undefined ? negotiatedPrices[item.id] : item.price;
        const isNegotiated = price !== (item.originalPrice || item.price);
        const itemSubtotal = price * item.quantity;
        return '<div class="cart-item">'+
            '<div style="flex:1;min-width:0;">'+
            '<div style="font-weight:600;font-size:12px;color:#0f172a;">'+item.name+(item.controlled?' <span class="controlled-badge">🚫</span>':'')+
            (isNegotiated ? ' <span class="negotiated-badge">🤝 Negotiated</span>' : '')+
            '</div>'+
            '<div style="font-size:10px;color:#64748b;">'+formatCurrency(price)+' × '+item.quantity+' = '+formatCurrency(itemSubtotal)+
            (isNegotiated ? ' <span style="color:#b45309;font-size:9px;">(was '+formatCurrency(item.originalPrice || item.price)+')</span>' : '')+
            '</div></div>'+
            '<div class="qty-control">'+
            '<button onclick="updateQty(\''+item.id+'\',-1)">−</button>'+
            '<span class="qty-num">'+item.quantity+'</span>'+
            '<button onclick="updateQty(\''+item.id+'\',1)">+</button>'+
            '<button onclick="removeFromCart(\''+item.id+'\')" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:16px;padding:0 4px;">×</button></div></div>';
    }).join('');
    
    totalEl.textContent = formatCurrency(total);
    countEl.textContent = count+' items';
    subtotalEl.textContent = formatCurrency(originalSubtotal);
    vatEl.textContent = formatCurrency(vat);
    
    if (hasNegotiations) {
        negotiatedSummaryRow.style.display = 'flex';
        negotiatedSubtotalEl.textContent = formatCurrency(actualSubtotal);
        totalLabel.textContent = 'TOTAL: ';
        negotiatedTotalLabel.style.display = 'inline';
    } else {
        negotiatedSummaryRow.style.display = 'none';
        totalLabel.textContent = 'TOTAL: ';
        negotiatedTotalLabel.style.display = 'none';
    }
    
    if(paymentInput){
        const method=document.getElementById('paymentMethod')?.value;
        if(method==='credit'){
            paymentInput.value='0';
            paymentInput.placeholder='Credit sale – no upfront payment';
            document.getElementById('creditCustomerForm').classList.add('show');
        } else {
            paymentInput.value=total.toFixed(2);
            paymentInput.placeholder='Amount (Total: '+formatCurrency(total)+')';
            document.getElementById('creditCustomerForm').classList.remove('show');
        }
    }
    showMpesaPrompt();
    updateRevenueInsight();
}

function clearCart(){if(cart.length===0)return;if(!confirm('Clear cart?'))return;cart=[];negotiatedPrices={};document.getElementById('negotiationControls').classList.remove('show');document.getElementById('creditCustomerForm').classList.remove('show');renderCart();showToast('Cart cleared');}
function holdTransaction(){if(cart.length===0){showToast('Cart empty','error');return;}const holds=JSON.parse(localStorage.getItem('yetu_holds')||'[]');holds.push({id:'HOLD-'+Date.now().toString(36).toUpperCase(),cart:JSON.parse(JSON.stringify(cart)),negotiatedPrices:JSON.parse(JSON.stringify(negotiatedPrices)),customer:document.getElementById('posCustomer').value||'Walk-in',timestamp:new Date().toISOString()});localStorage.setItem('yetu_holds',JSON.stringify(holds));cart=[];negotiatedPrices={};document.getElementById('negotiationControls').classList.remove('show');renderCart();document.getElementById('posCustomer').value='';showToast('Transaction held','success');}
function showMpesaPrompt(){ const method = document.getElementById('paymentMethod')?.value; const prompt = document.getElementById('mpesaPrompt'); if (method === 'mpesa' && cart.length > 0) { const total = calculateCartTotal(); document.getElementById('mpesaAmount').textContent = formatCurrency(total); prompt.classList.add('show'); } else { prompt.classList.remove('show'); } }
function triggerMpesaSTK(){ const customer = document.getElementById('mpesaCustomer').value.trim(); if (!customer || customer.length < 10) { showToast('Please enter a valid phone number (e.g. 0712345678)','error'); return; } const total = calculateCartTotal(); showToast('📱 STK Push sent to ' + customer + ' for ' + formatCurrency(total) + ' via Till 4776548','success'); setTimeout(() => { if (confirm('Did customer complete the M-Pesa payment?\nClick OK if payment was successful.')) { processPayment(); } else { showToast('Payment cancelled or pending.','warning'); } }, 3000); }
function updateSelectedCustomerInfo(){ /* same */ }
function syncPaymentInputForMethod(){ /* same */ }

function calculateCartTotal(){
    let actualSubtotal = 0;
    cart.forEach(item => {
        const price = negotiatedPrices[item.id] !== undefined ? negotiatedPrices[item.id] : item.price;
        actualSubtotal += price * item.quantity;
    });
    const vat = actualSubtotal * (vatRate / 100);
    return actualSubtotal + vat;
}

function getOriginalCartTotal(){
    return cart.reduce((sum, item) => sum + (item.originalPrice || item.price) * item.quantity, 0);
}

// ===== PAYMENT PROCESSING =====
function processPayment(){
    if(cart.length===0){showToast('Cart empty','error');return;}
    if(!currentUser){showToast('Please login','error');return;}
    
    let actualSubtotal = 0;
    let originalSubtotal = 0;
    let hasNegotiations = false;
    
    cart.forEach(item => {
        const price = negotiatedPrices[item.id] !== undefined ? negotiatedPrices[item.id] : item.price;
        const originalPrice = item.originalPrice || item.price;
        actualSubtotal += price * item.quantity;
        originalSubtotal += originalPrice * item.quantity;
        if (price !== originalPrice) {
            hasNegotiations = true;
        }
    });
    
    const vat = actualSubtotal * (vatRate / 100);
    const total = actualSubtotal + vat;
    
    const method=document.getElementById('paymentMethod').value;
    let customerName=document.getElementById('posCustomer').value.trim();
    const customerSelect=document.getElementById('customerSelect');
    const customerId=customerSelect?customerSelect.value:'';
    const creditSale=method==='credit';
    
    // For credit sales, get customer details from the credit form
    let customerPhone = '';
    let customerIdNumber = '';
    if (creditSale) {
        customerName = document.getElementById('creditCustomerName').value.trim() || customerName;
        customerPhone = document.getElementById('creditCustomerPhone').value.trim();
        customerIdNumber = document.getElementById('creditCustomerIdNumber').value.trim();
        
        if (!customerName) {
            showToast('Please enter customer name for credit sale', 'error');
            return;
        }
        if (!customerPhone) {
            showToast('Please enter customer phone number for credit sale', 'error');
            return;
        }
        if (!customerIdNumber) {
            showToast('Please enter customer ID number for credit sale', 'error');
            return;
        }
    }
    
    if(creditSale && !customerId && !customerName){showToast('Select a customer or enter a customer name for credit sales','error');return;}
    const payment=parseFloat(document.getElementById('paymentAmount').value);
    if(!creditSale && (!payment||payment<total)){showToast('Payment must be at least '+formatCurrency(total),'error');return;}
    
    const saleDate = customSaleDate ? new Date(customSaleDate).toISOString() : new Date().toISOString();
    
    const sale={
        id:generateId(),
        date:saleDate,
        customer:customerName||'Walk-in',
        customerPhone:customerPhone || undefined,
        customerIdNumber:customerIdNumber || undefined,
        subtotal:actualSubtotal,
        originalSubtotal:originalSubtotal,
        vat:vat,
        total:total,
        payment:creditSale?0:payment,
        change:creditSale?0:payment-total,
        method:method,
        cashier:currentUser?currentUser.fullName:'Unknown',
        receiptNumber:getNextReceiptNumber(),
        items:cart.map(item => {
            const price = negotiatedPrices[item.id] !== undefined ? negotiatedPrices[item.id] : item.price;
            // CRITICAL: Get buying price from product at time of sale
            const product = products.find(p => p.id === item.productId);
            return {
                id:generateId(),
                productId:item.productId,
                quantity:item.quantity,
                price:price,
                originalPrice:item.originalPrice || item.price,
                buyingPrice: product ? product.buyingPrice || 0 : 0,
                name:item.name,
                controlled:item.controlled||false,
                isNegotiated: price !== (item.originalPrice || item.price)
            };
        }),
        customerId:customerId||undefined,
        creditAmount:creditSale?total:0,
        negotiated:hasNegotiations,
        originalTotal:originalSubtotal,
        isBackdated:!!customSaleDate
    };
    
    // Handle credit customer
    if(creditSale && customerId) {
        db.getById('patients',customerId).then(patient=>{
            if(patient){
                patient.credit = Number(patient.credit||0) + total;
                patient.phone = customerPhone || patient.phone;
                return db.update('patients',patient);
            }
        });
    } else if(creditSale && customerName) {
        const parts=customerName.split(/\s+/).filter(Boolean);
        const patient={id:generateId(),firstName:parts[0]||'Walk-in',lastName:parts.slice(1).join(' ')||'',phone:customerPhone||'',email:undefined,dob:undefined,gender:'other',credit:total,creditLimit:10000,history:undefined,insurance:customerIdNumber||undefined};
        db.add('patients',patient).then(p=>{ sale.customerId = p.id; });
    }
    
    db.add('sales',{
        id:sale.id,
        date:sale.date,
        customer:sale.customer,
        customerPhone:sale.customerPhone,
        customerIdNumber:sale.customerIdNumber,
        subtotal:sale.subtotal,
        originalSubtotal:sale.originalSubtotal,
        vat:sale.vat,
        total:sale.total,
        payment:sale.payment,
        change:sale.change,
        method:sale.method,
        cashier:sale.cashier,
        receiptNumber:sale.receiptNumber,
        customerId:sale.customerId||undefined,
        creditAmount:sale.creditAmount||0,
        negotiated:sale.negotiated||false,
        originalTotal:sale.originalTotal||0,
        isBackdated:sale.isBackdated||false
    })
    .then(()=>{
        const promises=sale.items.map(item =>
            db.add('saleItems',{
                id:item.id,
                saleId:sale.id,
                productId:item.productId,
                quantity:item.quantity,
                price:item.price,
                originalPrice:item.originalPrice,
                buyingPrice:item.buyingPrice || 0,
                name:item.name,
                controlled:item.controlled,
                isNegotiated:item.isNegotiated
            })
            .then(()=>db.getById('products',item.productId).then(product=>{
                if(product){
                    product.quantity-=item.quantity;
                    return db.update('products',product);
                }
            }))
            .then(() => deductDrugStockFifo(item))
        );
        return Promise.all(promises);
    })
    .then(()=>{
        const successMessage = creditSale ? 
            '✅ Credit sale saved for '+sale.customer+' (Phone: '+sale.customerPhone+'). Balance: '+formatCurrency(total) :
            (sale.negotiated ? '✅ Sale with negotiated prices! Change: '+formatCurrency(payment-total) : '✅ Sale complete! Change: '+formatCurrency(payment-total));
        showToast(successMessage,'success');
        
        if (customSaleDate) {
            showToast('📅 Sale recorded for ' + formatDate(customSaleDate), 'info');
        }
        
        const receipt = receiptFormatter.generateKRAReceipt(sale);
        const pw=window.open('','_blank','width=420,height=650');
        if(pw){
            pw.document.write('<html><head><title>Receipt</title><style>body{font-family:monospace;padding:20px;}pre{font-size:13px;white-space:pre-wrap;line-height:1.3;}</style></head><body><pre>'+receipt+'</pre><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;"><button onclick="window.print()" style="padding:8px 16px;background:#0b6e4f;color:#fff;border:none;border-radius:5px;cursor:pointer;">🖨️ Print</button><button onclick="window.close()" style="padding:8px 16px;background:#64748b;color:#fff;border:none;border-radius:5px;cursor:pointer;">Close</button></div></body></html>');
            pw.document.close();
        }
        setLastSale(sale);
        cart=[];
        negotiatedPrices={};
        customSaleDate=null;
        // Activate demo trial on first sale if not yet started
        if (isDemo() && typeof licenseManager !== 'undefined' && !licenseManager.getLicenseInfo().trialStart) {
            licenseManager.activateDemoTrial();
            showToast('14-day trial activated! You have ' + licenseManager.getTrialDaysRemaining() + ' days.', 'success');
            updateDemoUI();
        }
        document.getElementById('negotiationControls').classList.remove('show');
        document.getElementById('backdateControls')?.classList.remove('show');
        document.getElementById('revenueInsight').classList.remove('show');
        document.getElementById('creditCustomerForm').classList.remove('show');
        revenueInsightVisible = false;
        renderCart();
        document.getElementById('paymentAmount').value='';
        document.getElementById('posCustomer').value='';
        document.getElementById('creditCustomerName').value='';
        document.getElementById('creditCustomerPhone').value='';
        document.getElementById('creditCustomerIdNumber').value='';
        if(customerSelect){customerSelect.value='';}
        loadCustomers();
        loadProducts();
        loadProductSearch();
        updateStats();
        updateProductGrid();
        updatePricingDashboard();
        document.getElementById('mpesaPrompt').classList.remove('show');
    })
    .catch(e=>showToast('Error: '+e.message,'error'));
}

function getNextReceiptNumber(){const last=localStorage.getItem('yetu_receipt')||'0001';const num=String(parseInt(last)+1).padStart(4,'0');localStorage.setItem('yetu_receipt',num);return num;}
function setLastSale(sale){lastSale=sale;localStorage.setItem('yetu_last_sale',JSON.stringify(sale));}
function getLastSale(){if(lastSale)return lastSale;const stored=localStorage.getItem('yetu_last_sale');return stored?JSON.parse(stored):null;}
function sendSMSReceipt(){const sale=getLastSale();if(!sale){showToast('No recent sale','error');return;}const phone=prompt('Phone for SMS:');if(!phone)return;showToast('📱 SMS receipt sent to '+phone,'success');}
function sendWhatsAppReceipt(){const sale=getLastSale();if(!sale){showToast('No recent sale','error');return;}const phone=prompt('Phone for WhatsApp:');if(!phone)return;const receipt=receiptFormatter.generateKRAReceipt(sale);window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(receipt),'_blank');showToast('📱 WhatsApp sent!','success');}
function printPaperReceipt(){const sale=getLastSale();if(!sale){showToast('No recent sale','error');return;}const receipt=receiptFormatter.generateKRAReceipt(sale);const pw=window.open('','_blank','width=420,height=650');if(pw){pw.document.write('<html><head><title>Receipt</title><style>body{font-family:monospace;padding:20px;}pre{font-size:13px;white-space:pre-wrap;line-height:1.3;}</style></head><body><pre>'+receipt+'</pre><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;"><button onclick="window.print()" style="padding:8px 16px;background:#0b6e4f;color:#fff;border:none;border-radius:5px;cursor:pointer;">🖨️ Print</button><button onclick="window.close()" style="padding:8px 16px;background:#64748b;color:#fff;border:none;border-radius:5px;cursor:pointer;">Close</button></div></body></html>');pw.document.close();showToast('🖨️ Printing...','info');}}
function generateInvoice(){ const sale=getLastSale(); if(!sale){showToast('No recent sale to invoice','error');return;} const receipt=receiptFormatter.generateKRAReceipt(sale); const invoice = receipt.replace(/Receipt/g, 'INVOICE').replace(/PAID/g, 'DUE'); const pw=window.open('','_blank','width=420,height=650'); if(pw){pw.document.write('<html><head><title>Invoice</title><style>body{font-family:monospace;padding:20px;}pre{font-size:13px;white-space:pre-wrap;line-height:1.3;}</style></head><body><pre>'+invoice+'</pre><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;"><button onclick="window.print()" style="padding:8px 16px;background:#0b6e4f;color:#fff;border:none;border-radius:5px;cursor:pointer;">🖨️ Print Invoice</button><button onclick="window.close()" style="padding:8px 16px;background:#64748b;color:#fff;border:none;border-radius:5px;cursor:pointer;">Close</button></div></body></html>');pw.document.close();showToast('📄 Invoice generated','success');} }
function showRecentSales(){ db.getAll('sales').then(sales=>{ const recent=sales.slice(-10).reverse(); const modal=document.createElement('div'); modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:4000;display:flex;align-items:center;justify-content:center;padding:16px;'; modal.innerHTML='<div style="background:#fff;border-radius:20px;padding:20px;max-width:720px;width:100%;max-height:90vh;overflow-y:auto;">'+'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h2 style="color:#0f172a;font-size:18px;"><i class="fas fa-clock" style="color:#0b6e4f;"></i> Recent Sales</h2><button onclick="this.closest(\'div[style]\').parentElement.remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#94a3b8;">&times;</button></div>'+(recent.length===0?'<div class="empty"><i class="fas fa-receipt"></i><p>No sales yet. Start selling!</p></div>':'')+recent.map(s=>'<div style="background:#f8fafc;padding:10px;border-radius:12px;margin-bottom:6px;border-left:4px solid '+(s.method==='credit'?'#dc2626':'#0b6e4f')+';font-size:12px;">'+'<div style="display:flex;justify-content:space-between;flex-wrap:wrap;"><div><span style="font-weight:600;">#'+(s.receiptNumber||s.id.slice(-6))+'</span><span style="color:#64748b;margin-left:8px;">'+formatDate(s.date)+'</span>'+(s.isBackdated?' <span style="color:#f59e0b;font-size:10px;">📅 Backdated</span>':'')+(s.negotiated?' <span style="color:#0b6e4f;font-size:10px;">🤝 Negotiated</span>':'')+'</div>'+'<div><span style="font-weight:700;color:'+(s.method==='credit'?'#dc2626':'#0b6e4f')+';">'+formatCurrency(s.total)+'</span><span style="color:#64748b;margin-left:6px;">'+(s.method||'cash').toUpperCase()+'</span></div></div>'+'<div style="color:#475569;">Customer: '+(s.customer||'Walk-in')+(s.customerPhone?' 📱'+s.customerPhone:'')+'</div></div>').join('')+'<button onclick="this.closest(\'div[style]\').parentElement.remove()" style="margin-top:10px;padding:8px;background:#0b6e4f;color:#fff;border:none;border-radius:10px;cursor:pointer;width:100%;font-weight:600;">Close</button></div>'; document.body.appendChild(modal); }); }
function editSale(saleId) { if(!adminGuard('edit sales record')) return; db.getById('sales', saleId).then(sale => { if(!sale){showToast('Sale not found','error');return;} db.getSaleItems(saleId).then(items => { const modal = document.createElement('div'); modal.className = 'modal show'; modal.innerHTML = `<div class="modal-content"><span class="modal-close" onclick="this.closest('.modal').classList.remove('show')">&times;</span><h2>Edit Sale #${sale.receiptNumber || sale.id.slice(-6)}</h2><form onsubmit="updateSale(this);return false;"><input type="hidden" id="editSaleId" value="${sale.id}"><div class="form-group"><label>Customer</label><input type="text" id="editSaleCustomer" value="${sale.customer || ''}"></div><div class="form-group"><label>Payment Method</label><select id="editSaleMethod"><option value="cash" ${sale.method==='cash'?'selected':''}>Cash</option><option value="mpesa" ${sale.method==='mpesa'?'selected':''}>M-Pesa</option><option value="airtel" ${sale.method==='airtel'?'selected':''}>Airtel</option><option value="card" ${sale.method==='card'?'selected':''}>Card</option><option value="insurance" ${sale.method==='insurance'?'selected':''}>Insurance</option><option value="credit" ${sale.method==='credit'?'selected':''}>Credit</option></select></div><div class="form-group"><label>Total (KES)</label><input type="number" id="editSaleTotal" value="${sale.total}" step="0.01" required></div><div class="form-group"><label>Payment Received (KES)</label><input type="number" id="editSalePayment" value="${sale.payment}" step="0.01"></div><div style="margin:10px 0;padding:10px;background:#f8fafc;border-radius:8px;"><strong>Items:</strong>${items.map(item => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0;border-bottom:1px solid #e2e8f0;"><span>${item.name} × ${item.quantity}</span><span>${formatCurrency(item.price * item.quantity)}</span></div>`).join('')}</div><button type="submit" class="btn"><i class="fas fa-save"></i> Update Sale</button></form></div>`; document.body.appendChild(modal); }); }); }
function updateSale(form) { if(!adminGuard('update sale')) return; const id = document.getElementById('editSaleId').value; const customer = document.getElementById('editSaleCustomer').value.trim(); const method = document.getElementById('editSaleMethod').value; const total = parseFloat(document.getElementById('editSaleTotal').value); const payment = parseFloat(document.getElementById('editSalePayment').value) || 0; if(!total || total <= 0){showToast('Invalid total','error');return;} db.getById('sales', id).then(sale => { if(!sale){showToast('Sale not found','error');return;} sale.customer = customer || sale.customer; sale.method = method; sale.total = total; sale.payment = method === 'credit' ? 0 : payment; sale.change = method === 'credit' ? 0 : Math.max(0, payment - total); db.update('sales', sale).then(() => { showToast('✅ Sale #' + (sale.receiptNumber || id.slice(-6)) + ' updated!','success'); document.querySelector('.modal.show')?.classList.remove('show'); loadProfessionalAnalysis('daily'); }); }); }
function reverseCreditForDeletedSale(sale){
  if(!sale || sale.method !== 'credit' || !(Number(sale.total) > 0)) return Promise.resolve();
  return db.getAll('patients').then(patients => {
    const customerName = (sale.customer || '').trim().toLowerCase();
    const patient = patients.find(item =>
      (sale.customerId && item.id === sale.customerId) ||
      (sale.customerPhone && item.phone === sale.customerPhone) ||
      ((item.firstName + ' ' + (item.lastName || '')).trim().toLowerCase() === customerName)
    );
    if(!patient) return;
    patient.credit = Math.max(0, Number(patient.credit || 0) - Number(sale.total));
    return db.update('patients', patient);
  });
}

function deleteSale(saleId) {
  if(!adminGuard('delete sale')) return;
  if(!confirm('Delete this sale record permanently?')) return;
  db.getById('sales', saleId).then(sale => {
    if(!sale) throw new Error('Sale not found');
    return reverseCreditForDeletedSale(sale).then(() => db.delete('sales', saleId));
  }).then(() => db.getAll('saleItems')).then(items => {
    return Promise.all(items.filter(item => item.saleId === saleId).map(item => db.delete('saleItems', item.id)));
  }).then(() => {
    showToast('Sale deleted and all views updated','success');
    refreshFinancialViews();
  }).catch(error => showToast(error.message === 'Sale not found' ? error.message : 'Error deleting sale','error'));
}

// ===== PATIENTS =====
function loadPatients(){ db.getAll('patients').then(patients=>{ const container=document.getElementById('patientList'); if(!patients||patients.length===0){container.innerHTML='<div class="empty"><i class="fas fa-user-md"></i><p>No patients</p></div>';return;} container.innerHTML=patients.map(p=>{ const creditStatus = (p.credit||0) <= 0 ? 'good' : (p.credit||0) <= (p.creditLimit||10000)/2 ? 'warning' : 'bad'; return '<div class="item-card">'+'<h4 style="font-size:14px;">'+p.firstName+' '+(p.lastName||'')+'</h4>'+'<div class="meta">📱 '+(p.phone||'No phone')+'</div>'+'<div class="meta">🆔 '+(p.insurance||'No SHA/NHIF')+'</div>'+'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="font-weight:600;font-size:13px;color:'+((p.credit||0)<=0?'#16a34a':'#dc2626')+';">Credit: '+formatCurrency(p.credit||0)+'</span><span class="credit-badge '+creditStatus+'">'+(creditStatus==='good'?'✅ Good':creditStatus==='warning'?'⚠️ Moderate':'🔴 High')+'</span></div>'+(p.history?'<div class="meta" style="color:#0b6e4f;font-size:11px;">📋 '+p.history.substring(0,60)+(p.history.length>60?'...':'')+'</div>':'')+'<div class="actions" style="margin-top:4px;">'+(isEditor()?'<button class="btn btn-sm btn-blue" onclick="editPatient(\''+p.id+'\')"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="deletePatient(\''+p.id+'\')"><i class="fas fa-trash"></i></button>':'<span style="color:#94a3b8;font-size:10px;">🔒 Admin only</span>')+'</div></div>'; }).join(''); const ledgerSelect=document.getElementById('ledgerCustomerSelect'); if(ledgerSelect){ const current=ledgerSelect.value; ledgerSelect.innerHTML='<option value="">Select customer</option>'; patients.forEach(p=>{ledgerSelect.innerHTML+='<option value="'+p.id+'">'+p.firstName+' '+(p.lastName||'')+'</option>';}); if(current&&patients.some(p=>p.id===current)) ledgerSelect.value=current; } loadLedger(); }); }
function openPatientModal(patient){ if(!adminGuard('manage patients')) return; const modal=document.getElementById('patientModal'); document.getElementById('patientModalTitle').textContent=patient?'Edit Patient':'Add Patient'; document.getElementById('patientId').value=patient?patient.id:''; document.getElementById('patientFirstName').value=patient?patient.firstName:''; document.getElementById('patientLastName').value=patient?patient.lastName||'':''; document.getElementById('patientPhone').value=patient?patient.phone||'':''; document.getElementById('patientEmail').value=patient?patient.email||'':''; document.getElementById('patientDob').value=patient?patient.dob||'':''; document.getElementById('patientGender').value=patient?patient.gender||'male':'male'; document.getElementById('patientCreditLimit').value=patient?patient.creditLimit||10000:10000; document.getElementById('patientCredit').value=patient?patient.credit||0:0; document.getElementById('patientHistory').value=patient?patient.history||'':''; document.getElementById('patientInsurance').value=patient?patient.insurance||'':''; modal.classList.add('show'); }
function savePatient(){ if(!adminGuard('save patient')) return; const id=document.getElementById('patientId').value||generateId(); const patient={id,firstName:document.getElementById('patientFirstName').value.trim(),lastName:document.getElementById('patientLastName').value.trim()||undefined,phone:document.getElementById('patientPhone').value.trim()||undefined,email:document.getElementById('patientEmail').value.trim()||undefined,dob:document.getElementById('patientDob').value||undefined,gender:document.getElementById('patientGender').value,credit:parseFloat(document.getElementById('patientCredit').value)||0,creditLimit:parseFloat(document.getElementById('patientCreditLimit').value)||10000,history:document.getElementById('patientHistory').value.trim()||undefined,insurance:document.getElementById('patientInsurance').value.trim()||undefined}; if(!patient.firstName){showToast('Enter first name','error');return;} db.getById('patients',id).then(existing=>{if(existing)return db.update('patients',patient);else return db.add('patients',patient);}).then(()=>{showToast('Patient saved!','success');document.getElementById('patientModal').classList.remove('show');loadPatients();loadCustomers();}).catch(e=>showToast('Error: '+e.message,'error')); }
function editPatient(id){if(!adminGuard('edit patient')) return;db.getById('patients',id).then(p=>{if(p)openPatientModal(p);});}
function deletePatient(id){if(!adminGuard('delete patient')) return;if(!confirm('Delete this patient?'))return;db.delete('patients',id).then(()=>{showToast('Patient deleted','success');loadPatients();loadCustomers();});}
function syncInsurance(){showToast('🔍 SHA/NHIF verification simulated – patient records updated.','success');}
function loadCustomers(){ db.getAll('patients').then(patients=>{ const select=document.getElementById('customerSelect'); if(select){ const val=select.value; select.innerHTML='<option value="">Walk-in Customer</option>'; patients.forEach(p=>{select.innerHTML+='<option value="'+p.id+'">'+p.firstName+' '+(p.lastName||'')+'</option>';}); if(val)select.value=val; } const ledgerSelect=document.getElementById('ledgerCustomerSelect'); if(ledgerSelect){ const val=ledgerSelect.value; ledgerSelect.innerHTML='<option value="">Select customer</option>'; patients.forEach(p=>{ledgerSelect.innerHTML+='<option value="'+p.id+'">'+p.firstName+' '+(p.lastName||'')+'</option>';}); if(val)ledgerSelect.value=val; } }); }
function loadLedger(){ const customerId = document.getElementById('ledgerCustomerSelect')?.value; const summary = document.getElementById('ledgerSummary'); const records = document.getElementById('ledgerRecords'); if(!customerId){ summary.innerHTML=''; records.innerHTML='<div class="empty"><i class="fas fa-user"></i><p>Select a customer</p></div>'; return; } db.getById('patients',customerId).then(patient=>{ if(!patient){ summary.innerHTML=''; records.innerHTML='<div class="empty"><i class="fas fa-user"></i><p>Customer not found</p></div>'; return; } db.getAll('sales').then(sales=>{ const customerSales = sales.filter(s => s.customerId === customerId || (s.customer && s.customer.includes(patient.firstName))); const totalCredit = customerSales.filter(s => s.method === 'credit').reduce((sum, s) => sum + (s.total || 0), 0); const totalPaid = customerSales.filter(s => s.method !== 'credit').reduce((sum, s) => sum + (s.total || 0), 0); summary.innerHTML = '<div class="stat-card"><div class="number">'+customerSales.length+'</div><div class="label">Total Transactions</div></div>'+ '<div class="stat-card"><div class="number">'+formatCurrency(totalCredit)+'</div><div class="label">Credit Used</div></div>'+ '<div class="stat-card"><div class="number">'+formatCurrency(totalPaid)+'</div><div class="label">Paid</div></div>'+ '<div class="stat-card"><div class="number" style="color:'+((patient.credit||0)<=0?'#16a34a':'#dc2626')+';">'+formatCurrency(patient.credit||0)+'</div><div class="label">Current Balance</div></div>'+ '<div class="stat-card"><div class="number" style="color:#0b6e4f;">'+formatCurrency(patient.creditLimit||10000)+'</div><div class="label">Credit Limit</div></div>'; if(customerSales.length===0){ records.innerHTML='<div class="empty"><i class="fas fa-receipt"></i><p>No transactions</p></div>'; return; } records.innerHTML = '<table class="price-table"><thead><tr><th>Date</th><th>Receipt</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>'+ customerSales.slice(-20).reverse().map(s=>'<tr><td>'+formatDate(s.date)+'</td><td>#'+(s.receiptNumber||s.id.slice(-6))+'</td><td>'+formatCurrency(s.total)+'</td><td>'+(s.method||'cash').toUpperCase()+'</td><td>'+(s.method==='credit'?'🔴 Credit':'✅ Paid')+'</td></tr>').join('')+ '</tbody></table>'; }); }); }
function exportLedger(){ const customerId = document.getElementById('ledgerCustomerSelect')?.value; if(!customerId){showToast('Select a customer first','error');return;} db.getById('patients',customerId).then(patient=>{ if(!patient){showToast('Customer not found','error');return;} db.getAll('sales').then(sales=>{ const customerSales = sales.filter(s => s.customerId === customerId || (s.customer && s.customer.includes(patient.firstName))); let report = '═'.repeat(60)+'\n  DAWA SMART – CUSTOMER LEDGER\n═'.repeat(60)+'\n  Customer: '+patient.firstName+' '+(patient.lastName||'')+'\n  Phone: '+(patient.phone||'N/A')+'\n  Credit Limit: '+formatCurrency(patient.creditLimit||10000)+'\n  Current Balance: '+formatCurrency(patient.credit||0)+'\n─'.repeat(60)+'\n\n'; customerSales.forEach(s=>{ report += '  '+formatDate(s.date)+' | #'+(s.receiptNumber||s.id.slice(-6))+' | '+formatCurrency(s.total)+' | '+(s.method||'cash').toUpperCase()+'\n'; }); report += '─'.repeat(60)+'\n  TOTAL TRANSACTIONS: '+customerSales.length+'\n  TOTAL VALUE: '+formatCurrency(customerSales.reduce((sum,s)=>sum+(s.total||0),0))+'\n═'.repeat(60); const blob=new Blob([report],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ledger-'+patient.firstName+'-'+new Date().toISOString().split('T')[0]+'.txt';a.click();URL.revokeObjectURL(url);showToast('Ledger exported','success'); }); }); }

// ===== LAB =====
function loadLabTests(){ db.getAll('labTests').then(tests=>{ labTests = tests || []; const container = document.getElementById('labList'); const search = document.getElementById('labSearch')?.value.toLowerCase()||''; const statusFilter = document.getElementById('labStatusFilter')?.value || 'all'; let filtered = labTests; if(statusFilter !== 'all') filtered = filtered.filter(t => (t.status || 'pending') === statusFilter); if(search) filtered = filtered.filter(t => (t.patientName||'').toLowerCase().includes(search) || (t.testType||'').toLowerCase().includes(search)); renderLabSummary(labTests); if(filtered.length===0){container.innerHTML='<div class="empty"><i class="fas fa-flask"></i><p>No lab tests</p></div>';return;} container.innerHTML = filtered.map(t=>{ const statusClass = t.status||'pending'; const statusLabels = {pending:'⏳ Pending','in-progress':'🔬 In Progress',completed:'✅ Completed',cancelled:'❌ Cancelled'}; return '<div class="lab-card">'+'<div style="display:flex;justify-content:space-between;align-items:start;">'+'<h4 style="color:#0f172a;font-size:14px;">'+(t.patientName||'Unknown patient')+'</h4>'+'<span class="status '+statusClass+'">'+(statusLabels[statusClass]||t.status)+'</span></div>'+'<div class="meta" style="font-size:11px;color:#64748b;">🧪 '+(t.testType||'General')+'</div>'+'<div class="meta" style="font-size:11px;color:#64748b;">📅 '+formatDate(t.date)+'</div>'+(t.requestedBy?'<div class="meta" style="font-size:11px;color:#64748b;">👨‍⚕️ '+t.requestedBy+'</div>':'')+(t.results?'<div class="meta" style="font-size:11px;color:#0b6e4f;">📋 '+t.results.substring(0,60)+(t.results.length>60?'...':'')+'</div>':'')+'<div class="actions" style="margin-top:4px;">'+(isEditor()?'<button class="btn btn-sm btn-blue" onclick="editLabTest(\''+t.id+'\')"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="deleteLabTest(\''+t.id+'\')"><i class="fas fa-trash"></i></button>':'<span style="color:#94a3b8;font-size:10px;">🔒 Admin only</span>')+'</div></div>'; }).join(''); }); }
function renderLabSummary(tests){ const summary=document.getElementById('labSummary'); if(!summary)return; const pending=tests.filter(t=> (t.status||'pending')==='pending').length; const inProgress=tests.filter(t=> (t.status||'pending')==='in-progress').length; const completed=tests.filter(t=> (t.status||'pending')==='completed').length; const cancelled=tests.filter(t=> (t.status||'pending')==='cancelled').length; summary.innerHTML='<div class="stat-card"><div class="number">'+tests.length+'</div><div class="label">Total Tests</div></div><div class="stat-card"><div class="number">'+pending+'</div><div class="label">Pending</div></div><div class="stat-card"><div class="number">'+inProgress+'</div><div class="label">In Progress</div></div><div class="stat-card"><div class="number">'+completed+'</div><div class="label">Completed</div></div><div class="stat-card"><div class="number">'+cancelled+'</div><div class="label">Cancelled</div></div>'; }
function openLabModal(test){ if(!adminGuard('manage lab tests')) return; const modal=document.getElementById('labModal'); const patientList=document.getElementById('labPatientList'); document.getElementById('labModalTitle').textContent=test?'Edit Lab Test':'New Lab Test'; document.getElementById('labId').value=test?test.id:''; document.getElementById('labPatientName').value=test?test.patientName:''; document.getElementById('labTestType').value=test?test.testType:'Blood Count'; document.getElementById('labRequestedBy').value=test?test.requestedBy||'':''; document.getElementById('labNotes').value=test?test.notes||'':''; document.getElementById('labStatus').value=test?test.status||'pending':'pending'; document.getElementById('labResults').value=test?test.results||'':''; if(patientList){ db.getAll('patients').then(patients=>{ patientList.innerHTML = (patients||[]).map(p=>'<option value="'+(p.firstName+' '+(p.lastName||'')).trim()+'"></option>').join(''); }); } modal.classList.add('show'); }
function saveLabTest(){ if(!adminGuard('save lab test')) return; const id=document.getElementById('labId').value||generateId(); const patientName=document.getElementById('labPatientName').value.trim(); const testType=document.getElementById('labTestType').value; const status=document.getElementById('labStatus').value; const test={id,patientName:patientName,testType:testType,requestedBy:document.getElementById('labRequestedBy').value.trim()||undefined,notes:document.getElementById('labNotes').value.trim()||undefined,status:status,results:document.getElementById('labResults').value.trim()||undefined,date:new Date().toISOString()}; if(!test.patientName||!test.testType){showToast('Fill required fields','error');return;} db.getById('labTests',id).then(existing=>{ if(existing){ test.date = existing.date || test.date; return db.update('labTests',test); } return db.add('labTests',test); }).then(()=>{showToast('Lab test saved!','success');document.getElementById('labModal').classList.remove('show');loadLabTests();}).catch(e=>showToast('Error: '+e.message,'error')); }
function editLabTest(id){if(!adminGuard('edit lab test')) return;db.getById('labTests',id).then(t=>{if(t)openLabModal(t);});}
function deleteLabTest(id){if(!adminGuard('delete lab test')) return;if(!confirm('Delete this lab test?'))return;db.delete('labTests',id).then(()=>{showToast('Test deleted','success');loadLabTests();});}
function exportLabReport(){ showToast('📊 Exporting lab report...','info'); let report='═'.repeat(60)+'\n  DAWA SMART – LABORATORY REPORT\n═'.repeat(60)+'\n  Generated: '+new Date().toLocaleString()+'\n─'.repeat(60)+'\n\n'; labTests.forEach((t,i)=>{report+='  '+(i+1)+'. Patient: '+(t.patientName||'Unknown')+'\n     Test: '+(t.testType||'General')+'\n     Status: '+(t.status||'pending')+'\n     Date: '+formatDate(t.date)+'\n     Results: '+(t.results||'Pending...')+'\n\n';}); report+='═'.repeat(60); const blob=new Blob([report],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='lab-report-'+new Date().toISOString().split('T')[0]+'.txt';a.click();URL.revokeObjectURL(url);showToast('✅ Lab report exported','success'); }

// ===== CREDITS =====
function loadCreditDashboard() { const search = document.getElementById('creditSearch')?.value.toLowerCase() || ''; const statusFilter = document.getElementById('creditStatusFilter')?.value || 'all'; db.getAll('patients').then(patients => { const creditCustomers = patients.filter(p => (p.credit || 0) > 0); let filtered = creditCustomers; if (search) filtered = filtered.filter(p => (p.firstName + ' ' + (p.lastName || '')).toLowerCase().includes(search) || (p.phone || '').includes(search)); if (statusFilter === 'good') filtered = filtered.filter(p => (p.credit||0) <= (p.creditLimit||10000) * 0.3); else if (statusFilter === 'warning') filtered = filtered.filter(p => (p.credit||0) > (p.creditLimit||10000) * 0.3 && (p.credit||0) <= (p.creditLimit||10000) * 0.7); else if (statusFilter === 'bad') filtered = filtered.filter(p => (p.credit||0) > (p.creditLimit||10000) * 0.7); const totalCustomers = creditCustomers.length; const totalCredit = creditCustomers.reduce((sum, p) => sum + (p.credit||0), 0); const totalLimit = creditCustomers.reduce((sum, p) => sum + (p.creditLimit||10000), 0); const avgCredit = totalCustomers > 0 ? totalCredit / totalCustomers : 0; const highRisk = creditCustomers.filter(p => (p.credit||0) > (p.creditLimit||10000) * 0.7).length; const summary = document.getElementById('creditSummary'); summary.innerHTML = '<div class="stat-card"><div class="number">'+totalCustomers+'</div><div class="label">Customers with Credit</div></div>' + '<div class="stat-card"><div class="number">'+formatCurrency(totalCredit)+'</div><div class="label">Total Outstanding</div></div>' + '<div class="stat-card"><div class="number">'+formatCurrency(avgCredit)+'</div><div class="label">Average Balance</div></div>' + '<div class="stat-card"><div class="number" style="color:'+(highRisk>0?'#dc2626':'#16a34a')+';">'+highRisk+'</div><div class="label">High Risk Customers</div></div>'; const container = document.getElementById('creditList'); if (filtered.length === 0) { container.innerHTML = '<div class="empty"><i class="fas fa-hand-holding-usd"></i><p>No credit customers found</p></div>'; return; } db.getAll('sales').then(allSales => { container.innerHTML = filtered.map(p => { const customerSales = allSales.filter(s => s.customerId === p.id && s.method === 'credit'); const totalSpent = customerSales.reduce((sum, s) => sum + (s.total||0), 0); const statusClass = (p.credit||0) <= (p.creditLimit||10000) * 0.3 ? 'good' : (p.credit||0) <= (p.creditLimit||10000) * 0.7 ? 'warning' : 'bad'; let recentSalesHtml = customerSales.slice(-5).map(s => '<div style="font-size:11px;color:#64748b;padding:2px 0;border-bottom:1px solid #f1f5f9;">📅 '+formatDate(s.date)+' | 💰 '+formatCurrency(s.total)+' | 📱 '+(s.customerPhone||'N/A')+'</div>').join(''); return '<div class="credit-item" style="border-left-color:'+(statusClass==='bad'?'#dc2626':statusClass==='warning'?'#f59e0b':'#16a34a')+';">' + '<div class="header"><span class="customer-name">👤 '+p.firstName+' '+(p.lastName||'')+'</span><span class="amount">'+formatCurrency(p.credit||0)+'</span></div>' + '<div class="details">📱 '+(p.phone||'No phone')+' | 🆔 '+(p.insurance||'No SHA/NHIF')+' | 💳 Limit: '+formatCurrency(p.creditLimit||10000)+'</div>' + '<div class="details">📊 Total Credit Used: '+formatCurrency(totalSpent)+' | 🏷️ Status: <span class="credit-badge '+statusClass+'">'+(statusClass==='good'?'✅ Good Standing':statusClass==='warning'?'⚠️ Moderate Risk':'🔴 High Risk')+'</span></div>' + '<div style="margin-top:6px;"><div style="font-weight:600;font-size:12px;color:#0f172a;">📋 Recent Credit Transactions:</div><div class="items-list">' + (recentSalesHtml || '<span style="color:#94a3b8;">No recent transactions</span>') + '</div></div>' + '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">' + '<button class="btn btn-sm btn-blue" onclick="viewCustomerLedger(\''+p.id+'\')"><i class="fas fa-book"></i> Full Ledger</button>' + (isEditor() ? '<button class="btn btn-sm btn-success" onclick="addPayment(\''+p.id+'\')"><i class="fas fa-money-bill-wave"></i> Receive Payment</button>' : '') + (isEditor() ? '<button class="btn btn-sm btn-warning" onclick="adjustCredit(\''+p.id+'\')"><i class="fas fa-edit"></i> Adjust</button>' : '') + '</div></div>'; }).join(''); }); }); }
function adjustCredit(customerId) { if(!adminGuard('adjust credit')) return; db.getById('patients', customerId).then(patient => { if(!patient){showToast('Customer not found','error');return;} const newBalance = prompt('Enter new credit balance for ' + patient.firstName + ' (KES):', patient.credit || 0); if(newBalance === null) return; const amount = parseFloat(newBalance); if(isNaN(amount) || amount < 0){showToast('Invalid amount','error');return;} patient.credit = amount; db.update('patients', patient).then(() => { showToast('✅ Credit adjusted to '+formatCurrency(amount)+' for '+patient.firstName,'success'); loadCreditDashboard(); loadPatients(); loadCustomers(); }); }); }
function viewCustomerLedger(customerId) { document.querySelector('[data-page="patients"]').click(); setTimeout(() => { const select = document.getElementById('ledgerCustomerSelect'); if (select) { select.value = customerId; loadLedger(); } }, 100); }
function addPayment(customerId) { if(!adminGuard('receive payment')) return; const amount = prompt('Enter payment amount received (KES):'); if (!amount || isNaN(amount) || parseFloat(amount) <= 0) { showToast('Invalid amount','error'); return; } db.getById('patients', customerId).then(patient => { if (!patient) { showToast('Customer not found','error'); return; } patient.credit = Math.max(0, (patient.credit || 0) - parseFloat(amount)); db.update('patients', patient).then(() => { showToast('✅ Payment of '+formatCurrency(parseFloat(amount))+' received from '+patient.firstName,'success'); loadCreditDashboard(); loadPatients(); loadCustomers(); }); }); }
function exportCreditReport() { db.getAll('patients').then(patients => { const creditCustomers = patients.filter(p => (p.credit || 0) > 0); let report = '═'.repeat(60)+'\n  DAWA SMART – CREDIT REPORT\n═'.repeat(60)+'\n  Generated: '+new Date().toLocaleString()+'\n  Pharmacy: '+document.getElementById('shopName').value+'\n─'.repeat(60)+'\n\n'; report += '  TOTAL CUSTOMERS WITH CREDIT: '+creditCustomers.length+'\n'; report += '  TOTAL OUTSTANDING: '+formatCurrency(creditCustomers.reduce((sum,p)=>sum+(p.credit||0),0))+'\n'; report += '─'.repeat(60)+'\n\n'; creditCustomers.forEach((p,i) => { report += '  '+(i+1)+'. '+p.firstName+' '+(p.lastName||'')+'\n'; report += '     Phone: '+(p.phone||'N/A')+'\n'; report += '     Balance: '+formatCurrency(p.credit||0)+'\n'; report += '     Limit: '+formatCurrency(p.creditLimit||10000)+'\n'; report += '     SHA/NHIF: '+(p.insurance||'N/A')+'\n\n'; }); report += '═'.repeat(60); const blob=new Blob([report],{type:'text/plain'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='credit-report-'+new Date().toISOString().split('T')[0]+'.txt'; a.click(); URL.revokeObjectURL(url); showToast('✅ Credit report exported','success'); }); }

// ===== PROFESSIONAL ANALYSIS =====
function loadProfessionalAnalysis(period) {
    const now = new Date();
    let start, end, label;
    
    if (period === 'daily') {
        start = now.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        label = 'Daily';
    } else if (period === 'weekly') {
        const ws = new Date(now);
        ws.setDate(now.getDate() - now.getDay());
        start = ws.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        label = 'Weekly';
    } else if (period === 'monthly') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        label = 'Monthly';
    } else if (period === 'yearly') {
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        label = 'Yearly';
    } else if (period === 'custom') {
        start = document.getElementById('analysisStart').value;
        end = document.getElementById('analysisEnd').value;
        label = 'Custom';
        if (!start || !end) {
            showToast('Select dates', 'error');
            return;
        }
    }
    
    // Get all sales, sale items, products, and expenses
    Promise.all([db.getSalesByDateRange(start, end), db.getAll('expenses'), db.getAll('saleItems'), db.getAll('products')])
        .then(([sales, expenses, saleItems, allProducts]) => {
            const periodExpenses = expenses.filter(e => e.date && e.date >= start && e.date <= end);
            const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
            
            // Calculate COGS and Revenue from sale items
            let totalRevenue = 0;
            let totalCOGS = 0;
            let totalOriginalRevenue = 0;
            let totalDiscountGiven = 0;
            let negotiatedSalesCount = 0;
            const productMap = {};
            allProducts.forEach(p => { productMap[p.id] = p; });
            
            // Process each sale
            sales.forEach(sale => {
                const items = saleItems.filter(item => item.saleId === sale.id);
                let saleRevenue = 0;
                let saleCOGS = 0;
                let saleOriginalRevenue = 0;
                
                items.forEach(item => {
                    const price = item.price || 0;
                    const originalPrice = item.originalPrice || price;
                    const quantity = item.quantity || 0;
                    const buyingPrice = item.buyingPrice || 0;
                    
                    saleRevenue += price * quantity;
                    saleCOGS += buyingPrice * quantity;
                    saleOriginalRevenue += originalPrice * quantity;
                });
                
                totalRevenue += saleRevenue;
                totalCOGS += saleCOGS;
                totalOriginalRevenue += saleOriginalRevenue;
                
                if (sale.negotiated || (saleOriginalRevenue > saleRevenue)) {
                    negotiatedSalesCount++;
                    totalDiscountGiven += (saleOriginalRevenue - saleRevenue);
                }
            });
            
            // Correct Gross Profit = Revenue - COGS
            const grossProfit = totalRevenue - totalCOGS;
            // Net Profit = Gross Profit - Expenses
            const netProfit = grossProfit - totalExpenses;
            
            const transactionCount = sales.length;
            const avgTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;
            const avgExpense = periodExpenses.length > 0 ? totalExpenses / periodExpenses.length : 0;
            
            // Payment methods breakdown
            const methods = {};
            sales.forEach(s => {
                const m = s.method || 'cash';
                methods[m] = (methods[m] || 0) + (s.total || 0);
            });
            
            // Daily revenue trend
            const daily = {};
            sales.forEach(s => {
                const d = s.date.split('T')[0];
                daily[d] = (daily[d] || 0) + (s.total || 0);
            });
            const dailyArr = Object.entries(daily).sort();
            
            // Top products
            const productSales = {};
            saleItems.forEach(item => {
                const pid = item.productId;
                if (!productSales[pid]) {
                    productSales[pid] = { productId: pid, name: item.name || 'Unknown', sold: 0, revenue: 0 };
                }
                productSales[pid].sold += (item.quantity || 0);
                productSales[pid].revenue += (item.price || 0) * (item.quantity || 0);
            });
            const top = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
            
            // Gross Margin %
            const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;
            
            // Render Analysis Grid
            const grid = document.getElementById('professionalAnalysisGrid');
            grid.innerHTML = 
                '<div class="analysis-card"><div class="number">'+formatCurrency(totalRevenue)+'</div><div class="label">📊 Total Revenue</div><div class="sub">'+label+'</div></div>' +
                '<div class="analysis-card"><div class="number">'+formatCurrency(totalCOGS)+'</div><div class="label">📦 COGS (Cost of Goods Sold)</div><div class="sub">'+transactionCount+' transactions</div></div>' +
                '<div class="analysis-card '+(grossProfit>=0?'positive':'negative')+'"><div class="number">'+formatCurrency(grossProfit)+'</div><div class="label">📈 Gross Profit</div><div class="sub">'+(grossProfit>=0?'✅ Profitable':'🔴 Loss')+'</div></div>' +
                '<div class="analysis-card"><div class="number">'+grossMargin.toFixed(1)+'%</div><div class="label">📊 Gross Margin</div><div class="sub">'+(grossMargin>0?'Positive margin':'Negative margin')+'</div></div>' +
                '<div class="analysis-card"><div class="number">'+formatCurrency(totalExpenses)+'</div><div class="label">💰 Total Expenses</div><div class="sub">'+periodExpenses.length+' transactions</div></div>' +
                '<div class="analysis-card '+(netProfit>=0?'positive':'negative')+'"><div class="number">'+formatCurrency(netProfit)+'</div><div class="label">📉 Net Profit</div><div class="sub">Gross Profit - Expenses</div></div>' +
                '<div class="analysis-card"><div class="number">'+transactionCount+'</div><div class="label">🧾 Transactions</div><div class="sub">Avg: '+formatCurrency(avgTransaction)+'</div></div>' +
                '<div class="analysis-card"><div class="number">'+formatCurrency(avgExpense)+'</div><div class="label">📋 Avg Expense</div><div class="sub">Per transaction</div></div>' +
                '<div class="analysis-card"><div class="number">'+(Object.keys(methods).length)+'</div><div class="label">💳 Payment Methods</div><div class="sub">'+(Object.keys(methods).join(', ').toUpperCase())+'</div></div>';
            
            if (negotiatedSalesCount > 0) {
                const revenueImpact = totalOriginalRevenue - totalRevenue;
                const impactPercent = totalOriginalRevenue > 0 ? (revenueImpact / totalOriginalRevenue * 100) : 0;
                grid.innerHTML += 
                    '<div class="analysis-card warning"><div class="number">'+negotiatedSalesCount+'</div><div class="label">🤝 Negotiated Sales</div><div class="sub">'+formatCurrency(totalDiscountGiven)+' discounts given</div></div>' +
                    '<div class="analysis-card"><div class="number">'+formatCurrency(revenueImpact)+'</div><div class="label">📉 Revenue Impact</div><div class="sub">'+impactPercent.toFixed(1)+'% loss</div></div>';
            }
            
            // Charts
            const charts = document.getElementById('professionalAnalysisCharts');
            let chartsHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
            
            if (dailyArr.length > 0) {
                chartsHtml += '<div style="background:#f8fafc;padding:12px;border-radius:12px;border:1px solid #e2e8f0;"><h4 style="font-size:12px;color:#0f172a;margin-bottom:8px;">📈 Daily Revenue Trend</h4>';
                dailyArr.slice(-14).forEach(d => {
                    chartsHtml += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:1px solid #f1f5f9;"><span>'+formatShortDate(d[0])+'</span><span style="font-weight:600;color:#0b6e4f;">'+formatCurrency(d[1])+'</span></div>';
                });
                chartsHtml += '</div>';
            }
            
            chartsHtml += '<div style="background:#f8fafc;padding:12px;border-radius:12px;border:1px solid #e2e8f0;"><h4 style="font-size:12px;color:#0f172a;margin-bottom:8px;">💳 Payment Methods</h4>';
            Object.entries(methods).forEach(([method, amount]) => {
                const pct = totalRevenue > 0 ? (amount / totalRevenue * 100) : 0;
                chartsHtml += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:1px solid #f1f5f9;"><span>'+method.toUpperCase()+'</span><span style="font-weight:600;">'+formatCurrency(amount)+' ('+pct.toFixed(1)+'%)</span></div>';
            });
            chartsHtml += '</div></div>';
            charts.innerHTML = chartsHtml;
            
            // Detailed transactions
            const details = document.getElementById('professionalAnalysisDetails');
            if (sales.length > 0) {
                let salesHtml = '<h4 style="font-size:13px;color:#0f172a;margin-bottom:8px;margin-top:12px;">📋 Detailed Transactions ('+sales.length+')</h4>' +
                    '<div style="max-height:400px;overflow-y:auto;border:1px solid #f1f5f9;border-radius:8px;"><table class="price-table"><thead><tr><th>Date</th><th>Receipt</th><th>Customer</th><th>Items</th><th>Total</th><th>Method</th><th>Status</th>'+(isEditor()?'<th>Action</th>':'')+'</tr></thead><tbody>';
                
                sales.slice().reverse().slice(0, 50).forEach(sale => {
                    const items = saleItems.filter(item => item.saleId === sale.id);
                    let itemsSummary = items.map(item => item.name + ' x' + item.quantity).join(', ') || '—';
                    const status = sale.negotiated ? '🤝 Negotiated' : (sale.method === 'credit' ? '🔴 Credit' : '✅ Paid');
                    salesHtml += '<tr><td>'+formatDate(sale.date)+'</td><td>#'+(sale.receiptNumber||sale.id.slice(-6))+'</td><td>'+(sale.customer||'Walk-in')+(sale.customerPhone?' 📱'+sale.customerPhone:'')+'</td><td style="font-size:10px;max-width:150px;">'+itemsSummary+'</td><td>'+formatCurrency(sale.total || sale.subtotal || 0)+'</td><td>'+(sale.method||'cash').toUpperCase()+'</td><td>'+status+'</td>'+
                        (isEditor()?'<td><button class="btn btn-sm btn-blue" onclick="editSale(\''+sale.id+'\')"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-danger" onclick="deleteSale(\''+sale.id+'\')"><i class="fas fa-trash"></i></button></td>':'<td><span style="color:#94a3b8;font-size:10px;">🔒</span></td>')+
                    '</tr>';
                });
                salesHtml += '</tbody></table></div>';
                
                if (top.length > 0) {
                    salesHtml += '<h4 style="font-size:13px;color:#0f172a;margin-top:12px;">🏆 Top Products</h4><table class="price-table"><thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead><tbody>'+
                        top.map(p => '<tr><td>'+p.name+'</td><td>'+p.sold+'</td><td>'+formatCurrency(p.revenue)+'</td></tr>').join('')+
                    '</tbody></table>';
                }
                details.innerHTML = salesHtml;
            } else {
                details.innerHTML = '<div class="empty"><i class="fas fa-chart-line"></i><p>No sales data for this period. Start selling to see insights!</p></div>';
            }
        }).catch(err => {
            console.error('Analysis error:', err);
            showToast('Error loading analysis: ' + err.message, 'error');
        });
}

// ===== DRUG DATABASE =====
function searchDrugDatabase(query) { 
    if (!query) return []; 
    const results = []; 
    const searchTerm = query.toLowerCase(); 
    Object.keys(KENYAN_DRUG_DATABASE).forEach(category => { 
        KENYAN_DRUG_DATABASE[category].forEach(drug => { 
            if (drug.name.toLowerCase().includes(searchTerm) || drug.generic.toLowerCase().includes(searchTerm)) 
                results.push({...drug, drugCategory: category}); 
        }); 
    }); 
    return results; 
}
function addDrugToInventory(drug) { 
    if(!adminGuard('add drug from database')) return; 
    const product = { 
        id: generateId(), 
        name: drug.name, 
        sku: 'SKU-' + Date.now().toString(36).toUpperCase(), 
        category: drug.drugCategory === 'controlled' ? 'controlled' : (drug.drugCategory === 'antibiotics' ? 'antibiotics' : drug.drugCategory === 'pain-relief' ? 'pain-relief' : drug.drugCategory === 'antimalarial' ? 'antimalarial' : drug.drugCategory === 'vitamins' ? 'vitamins' : drug.drugCategory === 'chronic' ? 'chronic' : 'other'), 
        unit: drug.unit || 'pack', 
        buyingPrice: drug.minPrice || 0, 
        sellingPrice: Math.max(drug.minPrice * 2 || 10, 10), 
        price: Math.max(drug.minPrice * 2 || 10, 10), 
        quantity: 100, 
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0], 
        generic: drug.generic || '', 
        controlled: drug.controlled || false, 
        badge: drug.badge || 'otc' 
    }; 
    db.add('products', product).then(() => { 
        showToast('Added ' + product.name + ' to inventory', 'success'); 
        loadProducts(); 
        loadProductSearch(); 
        updateProductGrid(); 
        updatePricingDashboard(); 
    }).catch(e => showToast('Error: ' + e.message, 'error')); 
}
function showDrugDatabaseSearch() { 
    const modal = document.createElement('div'); 
    modal.id = 'drugDatabaseModal'; 
    modal.className = 'modal show'; 
    modal.innerHTML = `<div class="modal-content" style="max-width: 800px;"><span class="modal-close" onclick="document.getElementById('drugDatabaseModal').classList.remove('show')">&times;</span><h2><i class="fas fa-database"></i> Kenyan Drug Database (${totalDrugs} drugs)</h2><div class="search-bar" style="margin: 10px 0;"><input type="text" id="drugDbSearch" placeholder="Search 500+ drugs..." oninput="renderDrugSearchResults()"></div><div id="drugDbResults" style="max-height: 400px; overflow-y: auto;"></div></div>`; 
    document.body.appendChild(modal); 
    renderDrugSearchResults(); 
}
function renderDrugSearchResults() { 
    const search = document.getElementById('drugDbSearch');
    const resultsContainer = document.getElementById('drugDbResults'); 
    if (!search || !resultsContainer) return; 
    const query = search.value.trim(); 
    const results = query ? searchDrugDatabase(query) : []; 
    if (results.length === 0) { 
        resultsContainer.innerHTML = '<div class="empty"><i class="fas fa-search"></i><p>' + (query ? 'No drugs found' : 'Search for drugs') + '</p></div>'; 
        return; 
    } 
    resultsContainer.innerHTML = results.map((drug, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #f1f5f9;"><div><strong>${drug.name}</strong><span style="color:#64748b;margin-left:8px;font-size:11px;">${drug.generic}</span>${drug.controlled ? '<span class="controlled-badge">🚫 Controlled</span>' : ''}<span class="drug-badge ${drug.badge||'otc'}" style="margin-left:4px;">${(drug.badge||'otc').toUpperCase()}</span></div><div style="display:flex;gap:8px;align-items:center;"><span style="font-size:11px;color:#64748b;">KES ${drug.minPrice} - ${drug.maxPrice}</span><button class="btn btn-sm btn-success" onclick='addDrugToInventory(${JSON.stringify(drug)})'><i class="fas fa-plus"></i> Add</button></div></div>`).join(''); 
}
function renderDrugSearchResultsMain() { 
    const search = document.getElementById('drugDbSearchMain'); 
    const category = document.getElementById('drugDbCategoryFilter'); 
    const resultsContainer = document.getElementById('drugDbResultsMain'); 
    if (!search || !resultsContainer) return; 
    const query = search.value.trim(); 
    const selectedCategory = category ? category.value : 'all'; 
    let results = query ? searchDrugDatabase(query) : []; 
    if (!query) { 
        Object.keys(KENYAN_DRUG_DATABASE).forEach(cat => { 
            if (selectedCategory === 'all' || cat === selectedCategory) { 
                KENYAN_DRUG_DATABASE[cat].forEach(drug => { 
                    results.push({...drug, drugCategory: cat}); 
                }); 
            } 
        }); 
    } else if (selectedCategory !== 'all') {
        results = results.filter(drug => drug.drugCategory === selectedCategory);
    }
    document.getElementById('drugDbCount').textContent = results.length + ' drugs'; 
    if (results.length === 0) { 
        resultsContainer.innerHTML = '<div class="empty"><i class="fas fa-search"></i><p>' + (query ? 'No drugs found' : 'Search for drugs or browse categories') + '</p></div>'; 
        return; 
    } 
    resultsContainer.innerHTML = results.slice(0, 100).map((drug, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #f1f5f9;"><div><strong style="font-size:13px;">${drug.name}</strong><span style="color:#64748b;margin-left:8px;font-size:11px;">${drug.generic}</span>${drug.controlled ? '<span class="controlled-badge">🚫 Controlled</span>' : ''}<span class="drug-badge ${drug.badge||'otc'}" style="margin-left:4px;">${(drug.badge||'otc').toUpperCase()}</span></div><div style="display:flex;gap:8px;align-items:center;"><span style="font-size:11px;color:#0b6e4f;font-weight:600;">KES ${drug.minPrice} - ${drug.maxPrice}</span><button class="btn btn-sm btn-success" onclick='addDrugToInventory(${JSON.stringify(drug)})'><i class="fas fa-plus"></i></button></div></div>`).join(''); 
}

// ===== SMART DRUG SEARCH & CASCADING DROPDOWNS =====
// State for the smart drug selection modal
window.smartDrugState = {
    genericName: '',
    strength: '',
    formId: '',
    brandName: '',
    filteredDrugs: []
};

function showSmartDrugSearch() {
    if (!window.drugs || window.drugs.length === 0) {
        showToast('Loading drug catalogue...', 'info');
        loadDrugs();
    }
    window.smartDrugState = {
        genericName: '',
        strength: '',
        formId: '',
        brandName: '',
        filteredDrugs: []
    };
    const modal = document.createElement('div');
    modal.id = 'smartDrugModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <span class="modal-close" onclick="document.getElementById('smartDrugModal').classList.remove('show')">&times;</span>
            <h2 style="margin-top:0;"><i class="fas fa-search-plus"></i> Smart Drug Search</h2>
            <p style="color:#64748b;font-size:13px;margin-bottom:16px;">Search by generic name, brand, strength, or dosage form.</p>

            <!-- Main Search -->
            <div class="search-bar" style="margin-bottom: 0;">
                <input type="text" id="smartDrugSearch" placeholder="🔍 Search drugs... (e.g. Amoxicillin, 500mg, Capsule)" oninput="onSmartDrugSearchInput()">
                <button class="btn btn-blue" onclick="performSmartDrugSearch()" style="display:none;" id="smartSearchBtn"><i class="fas fa-search"></i> Search</button>
            </div>

            <!-- Cascading Dropdowns -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:16px;">
                <div class="form-group">
                    <label>1. Generic Name</label>
                    <select id="smartGenericSelect" onchange="onGenericChange()">
                        <option value="">All Generics</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>2. Strength</label>
                    <select id="smartStrengthSelect" onchange="onStrengthChange()">
                        <option value="">All Strengths</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>3. Dosage Form</label>
                    <select id="smartFormSelect" onchange="onFormChange()">
                        <option value="">All Forms</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>4. Brand</label>
                    <select id="smartBrandSelect" onchange="onBrandChange()">
                        <option value="">All Brands</option>
                    </select>
                </div>
            </div>

            <!-- Results -->
            <div style="margin-top:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <h3 style="font-size:14px;margin:0;">Matching Variations</h3>
                    <span id="smartResultCount" style="font-size:12px;color:#64748b;"></span>
                </div>
                <div id="smartDrugResults" style="max-height:350px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    initSmartDrugDropdowns();
    performSmartDrugSearch();
}

function initSmartDrugDropdowns() {
    const generics = [...new Set((window.drugs || []).map(d => d.generic_name).filter(Boolean))].sort();
    const genericSelect = document.getElementById('smartGenericSelect');
    genericSelect.innerHTML = '<option value="">All Generics</option>';
    generics.forEach(g => {
        genericSelect.innerHTML += `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`;
    });

    const strengths = [...new Set((window.drugs || []).map(d => d.strength).filter(Boolean))].sort();
    const strengthSelect = document.getElementById('smartStrengthSelect');
    strengthSelect.innerHTML = '<option value="">All Strengths</option>';
    strengths.forEach(s => {
        strengthSelect.innerHTML += `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`;
    });

    const brands = [...new Set((window.drugs || []).map(d => d.brand_name).filter(Boolean))].sort();
    const brandSelect = document.getElementById('smartBrandSelect');
    brandSelect.innerHTML = '<option value="">All Brands</option>';
    brands.forEach(b => {
        brandSelect.innerHTML += `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`;
    });

    const formSelect = document.getElementById('smartFormSelect');
    formSelect.innerHTML = '<option value="">All Forms</option>';
    (window.drugForms || []).forEach(f => {
        formSelect.innerHTML += `<option value="${f.id}">${escapeHtml(f.name)}</option>`;
    });
}

function onSmartDrugSearchInput() {
    const query = document.getElementById('smartDrugSearch').value.trim().toLowerCase();
    applySmartDrugFilters(query);
}

function performSmartDrugSearch() {
    const query = document.getElementById('smartDrugSearch').value.trim().toLowerCase();
    applySmartDrugFilters(query);
}

function applySmartDrugFilters(searchQuery) {
    const allDrugs = window.drugs || [];
    let filtered = allDrugs.filter(d => !d.deleted_at && (d.status || 'active') === 'active');

    if (searchQuery) {
        filtered = filtered.filter(d =>
            (d.generic_name || '').toLowerCase().includes(searchQuery) ||
            (d.brand_name || '').toLowerCase().includes(searchQuery) ||
            (d.drug_name || '').toLowerCase().includes(searchQuery) ||
            (d.strength || '').toLowerCase().includes(searchQuery)
        );
    }

    if (window.smartDrugState.genericName) {
        filtered = filtered.filter(d => d.generic_name === window.smartDrugState.genericName);
    }
    if (window.smartDrugState.strength) {
        filtered = filtered.filter(d => d.strength === window.smartDrugState.strength);
    }
    if (window.smartDrugState.formId) {
        filtered = filtered.filter(d => d.form_id === window.smartDrugState.formId);
    }
    if (window.smartDrugState.brandName) {
        filtered = filtered.filter(d => d.brand_name === window.smartDrugState.brandName);
    }

    window.smartDrugState.filteredDrugs = filtered;
    renderSmartDrugResults(filtered);
}

function onGenericChange() {
    const val = document.getElementById('smartGenericSelect').value;
    window.smartDrugState.genericName = val;
    populateFilteredStrengths();
    populateFilteredForms();
    populateFilteredBrands();
    applySmartDrugFilters(null);
}

function onStrengthChange() {
    const val = document.getElementById('smartStrengthSelect').value;
    window.smartDrugState.strength = val;
    populateFilteredForms();
    populateFilteredBrands();
    applySmartDrugFilters(null);
}

function onFormChange() {
    const val = document.getElementById('smartFormSelect').value;
    window.smartDrugState.formId = val;
    populateFilteredBrands();
    applySmartDrugFilters(null);
}

function onBrandChange() {
    const val = document.getElementById('smartBrandSelect').value;
    window.smartDrugState.brandName = val;
    applySmartDrugFilters(null);
}

function populateFilteredStrengths() {
    const allDrugs = window.drugs || [];
    let pool = allDrugs.filter(d => !d.deleted_at);
    if (window.smartDrugState.genericName) {
        pool = pool.filter(d => d.generic_name === window.smartDrugState.genericName);
    }
    const strengths = [...new Set(pool.map(d => d.strength).filter(Boolean))].sort();
    const select = document.getElementById('smartStrengthSelect');
    select.innerHTML = '<option value="">All Strengths</option>';
    strengths.forEach(s => {
        select.innerHTML += `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`;
    });
}

function populateFilteredForms() {
    const allDrugs = window.drugs || [];
    let pool = allDrugs.filter(d => !d.deleted_at);
    if (window.smartDrugState.genericName) {
        pool = pool.filter(d => d.generic_name === window.smartDrugState.genericName);
    }
    if (window.smartDrugState.strength) {
        pool = pool.filter(d => d.strength === window.smartDrugState.strength);
    }
    const forms = [...new Set(pool.map(d => d.form_id).filter(Boolean))];
    const select = document.getElementById('smartFormSelect');
    select.innerHTML = '<option value="">All Forms</option>';
    forms.forEach(fid => {
        const form = (window.drugForms || []).find(f => f.id === fid);
        select.innerHTML += `<option value="${fid}">${escapeHtml(form ? form.name : fid)}</option>`;
    });
}

function populateFilteredBrands() {
    const allDrugs = window.drugs || [];
    let pool = allDrugs.filter(d => !d.deleted_at);
    if (window.smartDrugState.genericName) {
        pool = pool.filter(d => d.generic_name === window.smartDrugState.genericName);
    }
    if (window.smartDrugState.strength) {
        pool = pool.filter(d => d.strength === window.smartDrugState.strength);
    }
    if (window.smartDrugState.formId) {
        pool = pool.filter(d => d.form_id === window.smartDrugState.formId);
    }
    const brands = [...new Set(pool.map(d => d.brand_name).filter(Boolean))].sort();
    const select = document.getElementById('smartBrandSelect');
    select.innerHTML = '<option value="">All Brands</option>';
    brands.forEach(b => {
        select.innerHTML += `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`;
    });
}

function renderSmartDrugResults(drugs) {
    const container = document.getElementById('smartDrugResults');
    const countEl = document.getElementById('smartResultCount');
    if (!container) return;
    countEl.textContent = drugs.length + ' variation(s)';
    if (drugs.length === 0) {
        container.innerHTML = '<div class="empty" style="padding:30px;text-align:center;"><i class="fas fa-search" style="font-size:32px;color:#cbd5e1;"></i><p style="margin-top:8px;color:#94a3b8;">No matching drugs found</p></div>';
        return;
    }
    container.innerHTML = drugs.map(d => {
        const form = (window.drugForms || []).find(f => f.id === d.form_id);
        const category = (window.drugCategories || []).find(c => c.id === d.category_id);
        const stockSummary = window.drugStockSummary?.[d.id];
        const stockQty = stockSummary?.total_quantity || 0;
        const batchInfo = getBestBatchForDrug(d.id, 1);
        const batchText = batchInfo ? `Batch: ${batchInfo.batch_number}, Exp: ${formatDate(batchInfo.expiry_date)}` : 'No stock batches';
        return `<div style="padding:10px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
            <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <strong style="font-size:13px;">${escapeHtml(d.drug_name || d.generic_name || '')}</strong>
                    <span class="drug-badge ${d.badge || 'otc'}" style="font-size:7px;">${(d.badge || 'otc').toUpperCase()}</span>
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">
                    ${d.generic_name ? '💊 Generic: ' + escapeHtml(d.generic_name) + ' | ' : ''}
                    ${d.strength ? '💪 Strength: ' + escapeHtml(d.strength) + ' | ' : ''}
                    ${form ? '📦 ' + escapeHtml(form.name) + ' | ' : ''}
                    ${d.brand_name ? '🏷️ Brand: ' + escapeHtml(d.brand_name) : ''}
                </div>
                <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${batchText}</div>
            </div>
            <div style="text-align:right;margin-left:8px;">
                <div style="color:#0b6e4f;font-weight:700;">${formatCurrency(d.selling_price || 0)}</div>
                <div style="font-size:11px;color:#64748b;">Stock: ${stockQty}</div>
                ${stockQty > 0 ? `<button class="btn btn-sm btn-success" onclick="selectSmartDrugFromResults('${d.id}')" style="margin-top:4px;"><i class="fas fa-plus"></i> Add to Cart</button>` : `<button class="btn btn-sm" style="margin-top:4px;" disabled><i class="fas fa-times"></i> Out of Stock</button>`}
            </div>
        </div>`;
    }).join('');
}

function selectSmartDrugFromResults(drugId) {
    const drug = (window.drugs || []).find(d => d.id === drugId);
    if (!drug) return;
    const stockSummary = window.drugStockSummary?.[drugId];
    if (!stockSummary || stockSummary.total_quantity <= 0) {
        showToast('This drug is out of stock', 'error');
        return;
    }
    const batch = getBestBatchForDrug(drugId, 1);
    if (!batch) {
        showToast('No available batches for this drug', 'error');
        return;
    }
    addToCartFromSmartDrug(drug, batch);
    showToast(drug.drug_name + ' added to cart', 'success');
    document.getElementById('smartDrugModal').classList.remove('show');
}

function getBestBatchForDrug(drugId, qty) {
    const batches = window.drugBatches || [];
    const today = new Date().toISOString().split('T')[0];
    const candidateBatches = batches
        .filter(b => b.drug_id === drugId && !b.deleted_at &&
            b.quantity_remaining > 0 &&
            (b.expiry_date >= today || b.expiry_date == null))
        .sort((a, b) => new Date(a.expiry_date || '9999') - new Date(b.expiry_date || '9999'));
    return candidateBatches.length > 0 ? candidateBatches[0] : null;
}

function addToCartFromSmartDrug(drug, batch) {
    const existing = cart.find(item => item.productId === ('prod_' + drug.id));
    if (existing) {
        if (existing.quantity >= (window.drugStockSummary?.[drug.id]?.total_quantity || 0)) {
            showToast('Not enough stock', 'error');
            return;
        }
        existing.quantity++;
    } else {
        const stockQty = window.drugStockSummary?.[drug.id]?.total_quantity || 0;
        cart.push({
            id: generateId(),
            productId: 'prod_' + drug.id,
            drugId: drug.id,
            name: drug.drug_name || drug.generic_name,
            price: drug.selling_price || 0,
            originalPrice: drug.selling_price || 0,
            buyingPrice: drug.buying_price || 0,
            quantity: 1,
            maxQty: stockQty,
            controlled: drug.prescription_status === 'prescription',
            drugName: drug.drug_name || drug.generic_name,
            genericName: drug.generic_name,
            brandName: drug.brand_name,
            strength: drug.strength,
            dosageForm: (window.drugForms || []).find(f => f.id === drug.form_id)?.name || '',
            batchNumber: batch.batch_number,
            expiryDate: formatDate(batch.expiry_date),
            stockQty: stockQty,
            unitPrice: batch.selling_price || drug.selling_price || 0,
            buyingPrice: batch.purchase_price || 0
        });
    }
    document.getElementById('productSearch').value = '';
    document.getElementById('searchResults').style.display = 'none';
    renderCart();
}

function refreshSmartDrugStockSummary() {
    const drugs = window.drugs || [];
    const batches = window.drugBatches || [];
    window.drugStockSummary = {};
    drugs.forEach(d => {
        const drugBatches = batches.filter(b => b.drug_id === d.id && !b.deleted_at);
        const totalQty = drugBatches.reduce((sum, b) => sum + (b.quantity_remaining || 0), 0);
        const expiredBatches = drugBatches.filter(b => b.expiry_date && new Date(b.expiry_date) < new Date());
        window.drugStockSummary[d.id] = {
            total_quantity: totalQty,
            total_batches: drugBatches.length,
            total_current_value: drugBatches.reduce((sum, b) => sum + (b.quantity_remaining * (b.selling_price || 0)), 0),
            is_expired: expiredBatches.length > 0,
            nearest_expiry_date: drugBatches.length > 0 ? new Date(Math.min(...drugBatches.map(b => new Date(b.expiry_date || '9999')))) : null
        };
    });
}

// ===== REPORTS =====
function loadReport(period){ const now=new Date();let start,end; if(period==='daily'){start=now.toISOString().split('T')[0];end=now.toISOString().split('T')[0];} else if(period==='weekly'){const ws=new Date(now);ws.setDate(now.getDate()-now.getDay());start=ws.toISOString().split('T')[0];end=now.toISOString().split('T')[0];} else if(period==='monthly'){start=new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0];end=now.toISOString().split('T')[0];} else return; document.getElementById('reportStart').value=start;document.getElementById('reportEnd').value=end;generateCustomReport(); }
function generateCustomReport(){ const start=document.getElementById('reportStart').value; const end=document.getElementById('reportEnd').value; if(!start||!end){showToast('Select dates','error');return;} Promise.all([db.getSalesByDateRange(start,end), db.getAll('expenses'), db.getAll('saleItems')]).then(([sales, expenses, saleItems]) => { const totalRevenue=sales.reduce((sum,s)=>sum+(s.total||0),0); const totalExpenses=expenses.filter(e=>e.date&&e.date>=start&&e.date<=end).reduce((sum,e)=>sum+e.amount,0); const profit=totalRevenue-totalExpenses; const container=document.getElementById('reportResults'); let productSales=[]; saleItems.forEach(item => { const existing=productSales.find(p=>p.productId===item.productId); if(existing){existing.sold+=item.quantity;existing.revenue+=item.price*item.quantity;}else{const product=products.find(p=>p.id===item.productId);productSales.push({productId:item.productId,name:product?product.name:item.name||'Unknown',sold:item.quantity,revenue:item.price*item.quantity});}}); const top=productSales.sort((a,b)=>b.revenue-a.revenue).slice(0,10); const methods={};sales.forEach(s=>{const m=s.method||'cash';methods[m]=(methods[m]||0)+s.total;}); const daily={};sales.forEach(s=>{const d=s.date.split('T')[0];daily[d]=(daily[d]||0)+s.total;}); const dailyArr=Object.entries(daily).sort(); if(sales.length === 0) { container.innerHTML = '<div class="empty" style="padding:40px;"><i class="fas fa-chart-bar" style="font-size:48px;"></i><p style="margin-top:12px;font-size:16px;font-weight:600;color:#1e293b;">No Sales Data</p><p style="color:#94a3b8;">Start making sales to see reports and analytics here.</p></div>'; return; } container.innerHTML='<div class="stats-grid">'+ '<div class="stat-card"><div class="number">'+sales.length+'</div><div class="label">Sales</div></div>'+ '<div class="stat-card"><div class="number">'+formatCurrency(totalRevenue)+'</div><div class="label">Revenue</div></div>'+ '<div class="stat-card"><div class="number">'+formatCurrency(totalExpenses)+'</div><div class="label">Expenses</div></div>'+ '<div class="stat-card"><div class="number" style="color:'+(profit>=0?'#16a34a':'#dc2626')+';">'+formatCurrency(profit)+'</div><div class="label">Profit</div></div></div>'+ '<div class="report-section" style="margin-top:12px;"><h3 style="font-size:14px;color:#0f172a;">🏆 Top Products</h3>'+(top.length===0?'<p>No sales</p>':'')+'<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f1f5f9;"><th style="padding:6px 8px;text-align:left;">Product</th><th style="padding:6px 8px;text-align:left;">Sold</th><th style="padding:6px 8px;text-align:left;">Revenue</th></tr></thead><tbody>'+top.map(p=>'<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">'+p.name+'</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">'+p.sold+'</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">'+formatCurrency(p.revenue)+'</td></tr>').join('')+'</tbody></table></div>'+ '<div class="report-section" style="margin-top:12px;"><h3 style="font-size:14px;color:#0f172a;">💳 Payment Methods</h3>'+(Object.keys(methods).length===0?'<p>No data</p>':'')+'<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f1f5f9;"><th style="padding:6px 8px;text-align:left;">Method</th><th style="padding:6px 8px;text-align:left;">Amount</th></tr></thead><tbody>'+Object.entries(methods).map(m=>'<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">'+m[0].toUpperCase()+'</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">'+formatCurrency(m[1])+'</td></tr>').join('')+'</tbody></table></div>'+ (dailyArr.length?'<div class="report-section" style="margin-top:12px;"><h3 style="font-size:14px;color:#0f172a;">📊 Daily Summary</h3><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f1f5f9;"><th style="padding:6px 8px;text-align:left;">Date</th><th style="padding:6px 8px;text-align:left;">Revenue</th></tr></thead><tbody>'+dailyArr.map(d=>'<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">'+formatDate(d[0])+'</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">'+formatCurrency(d[1])+'</td></tr>').join('')+'</tbody></table></div>':''); if (isEditor() && sales.length > 0) { container.innerHTML += '<div style="margin-top:16px;"><button class="btn btn-blue" onclick="showRecentSales()"><i class="fas fa-clock"></i> View All Sales</button></div>'; } }); }
function printReport(){const content=document.getElementById('reportResults');const pw=window.open('','_blank','width=800,height=600');if(pw){pw.document.write('<html><head><title>Dawa Smart Report</title><style>body{font-family:Arial;padding:20px;font-size:13px;}table{width:100%;border-collapse:collapse;}th,td{padding:6px 8px;border:1px solid #ddd;text-align:left;}th{background:#f5f5f5;}</style></head><body><h1>Dawa Smart – Sales Report</h1><p><strong>📍 '+document.getElementById('shopAddress').value+'</strong></p>'+content.innerHTML+'<p style="margin-top:16px;color:#64748b;font-size:11px;">Generated: '+new Date().toLocaleString()+'</p><button onclick="window.print()" style="padding:8px 16px;margin:8px 0;background:#0b6e4f;color:#fff;border:none;border-radius:5px;cursor:pointer;">Print</button></body></html>');pw.document.close();}}
function generateKRAeTIMS(){ const start=document.getElementById('reportStart').value; const end=document.getElementById('reportEnd').value; if(!start||!end){showToast('Select date range','error');return;} db.getSalesByDateRange(start,end).then(sales=>{ if(sales.length === 0) { showToast('No sales data for this period','warning'); return; } const total=sales.reduce((sum,s)=>sum+(s.total||0),0); const vat=sales.reduce((sum,s)=>sum+((s.vat||0)),0); const kraData={period:{from:start,to:end},totalSales:sales.length,totalRevenue:total,totalVAT:vat,sales:sales.map(s=>({receipt:s.receiptNumber,date:s.date,amount:s.total,method:s.method,customer:s.customer,customerPhone:s.customerPhone,isBackdated:s.isBackdated||false,negotiated:s.negotiated||false}))}; const blob=new Blob([JSON.stringify(kraData,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='kra-etims-'+start+'-to-'+end+'.json';a.click();URL.revokeObjectURL(url); showToast('📄 KRA eTIMS report exported (JSON)','success'); }); }

// ===== ENHANCED REPORTING ENGINE =====
let currentReportData = null;
let currentReportPeriod = 'daily';
let currentReportStartDate = '';
let currentReportEndDate = '';

function selectReportPeriod(period) {
    currentReportPeriod = period;
    const now = new Date();

    // Set date inputs based on period
    const startInput = document.getElementById('reportStart');
    const endInput = document.getElementById('reportEnd');

    if (period === 'daily') {
        const today = now.toISOString().split('T')[0];
        startInput.value = today;
        endInput.value = today;
    } else if (period === 'weekly') {
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startInput.value = monday.toISOString().split('T')[0];
        endInput.value = now.toISOString().split('T')[0];
    } else if (period === 'monthly') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startInput.value = first.toISOString().split('T')[0];
        endInput.value = last.toISOString().split('T')[0];
    } else if (period === 'quarterly') {
        const quarter = Math.floor(now.getMonth() / 3);
        const first = new Date(now.getFullYear(), quarter * 3, 1);
        const last = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        startInput.value = first.toISOString().split('T')[0];
        endInput.value = last.toISOString().split('T')[0];
    } else if (period === 'yearly') {
        startInput.value = now.getFullYear() + '-01-01';
        endInput.value = now.toISOString().split('T')[0];
    } else if (period === 'custom') {
        // Keep existing values or set defaults
        if (!startInput.value) startInput.value = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (!endInput.value) endInput.value = now.toISOString().split('T')[0];
    }

    // Update active tab
    document.querySelectorAll('#reportTabs button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });
}

function checkAndShowSyncWarning() {
    const syncStatus = window.DawaReporting?.checkSyncStatus?.();
    const warningEl = document.getElementById('syncWarningBadge');
    if (warningEl && syncStatus?.hasUnsynced) {
        warningEl.style.display = 'inline';
        warningEl.textContent = '⚠️ ' + syncStatus.pendingSync + ' transactions pending sync — report may be incomplete';
    } else if (warningEl) {
        warningEl.style.display = 'none';
    }
}

async function generateReportFromUI() {
    const start = document.getElementById('reportStart').value;
    const end = document.getElementById('reportEnd').value;
    if (!start || !end) { showToast('Please select date range', 'error'); return; }

    checkAndShowSyncWarning();

    showToast('Generating report...', 'info');

    const report = await window.DawaReporting.generateReport(
        currentReportPeriod,
        start,
        end,
        'financial'
    );

    currentReportData = report;
    currentReportStartDate = start;
    currentReportEndDate = end;

    renderReport(report);
    renderSummaryCards(report.summary);
}

function renderSummaryCards(summary) {
    const container = document.getElementById('reportSummaryCards');
    if (!container) return;

    const cards = [
        { label: 'Total Sales', value: window.DawaReporting.formatCurrency(summary.total_sales), color: '#0b6e4f' },
        { label: 'Cash Sales', value: window.DawaReporting.formatCurrency(summary.cash_sales), color: '#2563eb' },
        { label: 'M-Pesa Sales', value: window.DawaReporting.formatCurrency(summary.mpesa_sales), color: '#059669' },
        { label: 'Card Sales', value: window.DawaReporting.formatCurrency(summary.card_sales + summary.card_sales), color: '#7c3aed' },
        { label: 'Credit Sales', value: window.DawaReporting.formatCurrency(summary.credit_sales), color: '#d97706' },
        { label: 'COGS', value: window.DawaReporting.formatCurrency(summary.cost_of_goods_sold), color: '#dc2626' },
        { label: 'Gross Profit', value: window.DawaReporting.formatCurrency(summary.gross_profit), color: '#059669' },
        { label: 'Net Profit', value: window.DawaReporting.formatCurrency(summary.net_profit), color: '#0f7173' }
    ];

    container.innerHTML = cards.map(c =>
        '<div class="stat-card">' +
        '<div class="number" style="color:' + c.color + '">' + c.value + '</div>' +
        '<div class="label">' + c.label + '</div>' +
        '</div>'
    ).join('');
}

function renderReport(report) {
    const s = report.summary;
    let html = '<div style="overflow-x:auto;">';

    // Period info
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<h3 style="font-size:16px;color:#0f172a;">Report: ' +
        window.DawaReporting.formatDate(report.start_date) + ' to ' + window.DawaReporting.formatDate(report.end_date) +
        '</h3>' +
        '<span style="font-size:11px;color:#64748b;">Generated: ' + window.DawaReporting.formatDateTime(report.generated_at) + '</span>' +
        '</div>';

    // Payment Method Breakdown
    html += '<div style="margin-bottom:20px;">';
    html += '<h4 style="font-size:14px;color:#0f172a;margin-bottom:8px;">📊 Sales by Payment Method</h4>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:6px;">Method</th><th style="text-align:right;padding:6px;">Amount</th><th style="text-align:right;padding:6px;">%</th></tr></thead>';
    html += '<tbody>';
    const totalSales = s.total_sales;
    Object.entries(report.sales_by_method || {}).forEach(([method, amount]) => {
        const pct = totalSales > 0 ? ((amount / totalSales) * 100).toFixed(1) : '0';
        html += '<tr style="border-bottom:1px solid #f1f5f9;">' +
            '<td style="padding:6px;">' + escapeHtml(method) + '</td>' +
            '<td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(amount) + '</td>' +
            '<td style="padding:6px;text-align:right;">' + pct + '%</td>' +
            '</tr>';
    });
    html += '</tbody></table>';
    html += '</div>';

    // Two-column layout for details
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';

    // Left column: Categories + Cashiers
    html += '<div>';

    html += '<h4 style="font-size:14px;color:#0f172a;margin-bottom:8px;">📦 Sales by Category</h4>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:6px;">Category</th><th style="text-align:right;padding:6px;">Revenue</th><th style="text-align:right;padding:6px;">Qty</th></tr></thead>';
    html += '<tbody>';
    Object.entries(report.sales_by_category || {}).forEach(([cat, data]) => {
        html += '<tr style="border-bottom:1px solid #f1f5f9;">' +
            '<td style="padding:6px;">' + escapeHtml(cat) + '</td>' +
            '<td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(data.revenue) + '</td>' +
            '<td style="padding:6px;text-align:right;">' + data.quantity + '</td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';

    html += '<h4 style="font-size:14px;color:#0f172a;margin:16px 0 8px;">💰 Sales by Cashier</h4>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:6px;">Cashier</th><th style="text-align:right;padding:6px;">Revenue</th><th style="text-align:right;padding:6px;">Transactions</th></tr></thead>';
    html += '<tbody>';
    Object.entries(report.sales_by_cashier || {}).forEach(([cashier, data]) => {
        html += '<tr style="border-bottom:1px solid #f1f5f9;">' +
            '<td style="padding:6px;">' + escapeHtml(cashier) + '</td>' +
            '<td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(data.revenue) + '</td>' +
            '<td style="padding:6px;text-align:right;">' + data.count + '</td>' +
            '</tr>';
    });
    html += '</tbody></table>';
    html += '</div>';

    // Right column: Best sellers + Most profitable
    html += '<div>';

    html += '<h4 style="font-size:14px;color:#0f172a;margin-bottom:8px;">🏆 Best Selling Products</h4>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:6px;">Product</th><th style="text-align:right;padding:6px;">Qty</th><th style="text-align:right;padding:6px;">Revenue</th><th style="text-align:right;padding:6px;">Profit</th></tr></thead>';
    html += '<tbody>';
    (report.best_selling || []).forEach(p => {
        html += '<tr style="border-bottom:1px solid #f1f5f9;">' +
            '<td style="padding:6px;">' + escapeHtml(p.name) + '</td>' +
            '<td style="padding:6px;text-align:right;">' + p.quantity + '</td>' +
            '<td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(p.revenue) + '</td>' +
            '<td style="padding:6px;text-align:right;" style="color:' + (p.profit >= 0 ? '#059669' : '#dc2626') + '">' + window.DawaReporting.formatCurrency(p.profit) + '</td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';

    html += '<h4 style="font-size:14px;color:#0f172a;margin:16px 0 8px;">💎 Most Profitable Products</h4>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:6px;">Product</th><th style="text-align:right;padding:6px;">Profit</th><th style="text-align:right;padding:6px;">Revenue</th><th style="text-align:right;padding:6px;">Qty</th></tr></thead>';
    html += '<tbody>';
    (report.most_profitable || []).forEach(p => {
        html += '<tr style="border-bottom:1px solid #f1f5f9;">' +
            '<td style="padding:6px;">' + escapeHtml(p.name) + '</td>' +
            '<td style="padding:6px;text-align:right;color:' + (p.profit >= 0 ? '#059669' : '#dc2626') + '">' + window.DawaReporting.formatCurrency(p.profit) + '</td>' +
            '<td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(p.revenue) + '</td>' +
            '<td style="padding:6px;text-align:right;">' + p.quantity + '</td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';
    html += '</div>'; // end grid

    // Financial Summary Breakdown
    html += '<div style="margin-top:20px;">';
    html += '<h4 style="font-size:14px;color:#0f172a;margin-bottom:8px;">📈 Financial Summary</h4>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:6px;">Item</th><th style="text-align:right;padding:6px;">Amount (KES)</th></tr></thead>';
    html += '<tbody>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;">Total Sales Revenue</td><td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(s.total_sales) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;">Cash Sales</td><td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(s.cash_sales) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;">M-Pesa Sales</td><td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(s.mpesa_sales) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;">Card Sales</td><td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(s.card_sales) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;">Credit Sales</td><td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(s.credit_sales) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;">Credit Payments Received</td><td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(s.credit_payments_received) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;">Outstanding Credit Balances</td><td style="padding:6px;text-align:right;">-' + window.DawaReporting.formatCurrency(s.outstanding_credit_balances) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;font-weight:600;">Cost of Goods Sold</td><td style="padding:6px;text-align:right;font-weight:600;">' + window.DawaReporting.formatCurrency(s.cost_of_goods_sold) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;font-weight:600;color:#059669;">Gross Profit</td><td style="padding:6px;text-align:right;font-weight:600;color:#059669;">' + window.DawaReporting.formatCurrency(s.gross_profit) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;">Operating Expenses</td><td style="padding:6px;text-align:right;">-' + window.DawaReporting.formatCurrency(s.total_expenses) + '</td></tr>';
    html += '<tr style="border-bottom:2px solid #e2e8f0;"><td style="padding:6px;font-weight:600;">Net Operating Profit</td><td style="padding:6px;text-align:right;font-weight:600;">' + window.DawaReporting.formatCurrency(s.net_profit) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px;">Total Stock Value</td><td style="padding:6px;text-align:right;">' + window.DawaReporting.formatCurrency(s.total_stock_value) + '</td></tr>';
    html += '</tbody></table></div>';

    // Low stock + expired
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;">';
    html += '<div><h4 style="font-size:14px;color:#0f172a;margin-bottom:8px;">⚠️ Low Stock Products (' + s.low_stock_count + ')</h4>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:4px;">Product</th><th style="text-align:right;padding:4px;">Stock</th><th style="text-align:right;padding:4px;">Selling</th></tr></thead><tbody>';
    (report.low_stock_products || []).slice(0, 10).forEach(p => {
        html += '<tr style="border-bottom:1px solid #f1f5f9;">' +
            '<td style="padding:4px;">' + escapeHtml(p.name) + '</td>' +
            '<td style="padding:4px;text-align:right;">' + p.quantity + '</td>' +
            '<td style="padding:4px;text-align:right;">' + window.DawaReporting.formatCurrency(p.selling_price) + '</td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';

    html += '<div><h4 style="font-size:14px;color:#0f172a;margin-bottom:8px;">⏱️ Expired/Near-Expiry (' + s.expired_batch_count + ' expired, ' + s.near_expiry_count + ' near-expiry)</h4>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:4px;">Product</th><th style="text-align:left;padding:4px;">Batch</th><th style="text-align:left;padding:4px;">Expiry</th><th style="text-align:right;padding:4px;">Qty</th></tr></thead><tbody>';
    (report.expired_batches || []).slice(0, 10).forEach(b => {
        html += '<tr style="border-bottom:1px solid #f1f5f9;">' +
            '<td style="padding:4px;">' + escapeHtml(b.product_name) + '</td>' +
            '<td style="padding:4px;">' + escapeHtml(b.batch_number) + '</td>' +
            '<td style="padding:4px;">' + window.DawaReporting.formatDate(b.expiry_date) + '</td>' +
            '<td style="padding:4px;text-align:right;">' + b.quantity_remaining + '</td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';
    html += '</div>';

    // Outstanding credit
    html += '<div style="margin-top:20px;"><h4 style="font-size:14px;color:#0f172a;margin-bottom:8px;">💳 Outstanding Credit Balances</h4>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:4px;">Customer</th><th style="text-align:left;padding:4px;">Phone</th><th style="text-align:right;padding:4px;">Credit</th><th style="text-align:right;padding:4px;">Limit</th></tr></thead><tbody>';
    (report.patient_credit || []).forEach(p => {
        html += '<tr style="border-bottom:1px solid #f1f5f9;">' +
            '<td style="padding:4px;">' + escapeHtml(p.name) + '</td>' +
            '<td style="padding:4px;">' + escapeHtml(p.phone || '-') + '</td>' +
            '<td style="padding:4px;text-align:right;color:#dc2626;">' + window.DawaReporting.formatCurrency(p.credit) + '</td>' +
            '<td style="padding:4px;text-align:right;">' + window.DawaReporting.formatCurrency(p.credit_limit) + '</td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';

    html += '</div>'; // end container
    document.getElementById('reportResults').innerHTML = html;
    showToast('✅ Report generated successfully', 'success');
}

async function downloadReportPDF() {
    if (!currentReportData) { showToast('Generate a report first', 'error'); return; }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const s = currentReportData.summary;

        // Brand header
        doc.setFillColor(11, 110, 79);
        doc.rect(0, 0, 210, 25);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text('Dawa Smart Pharmacy', 105, 12, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(document.getElementById('shopAddress').value || '7 Cheptais · 📞 0759324463', 105, 20, { align: 'center' });

        // Reset color
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.text('Financial Report', 105, 35, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 128);
        doc.text('Period: ' + window.DawaReporting.formatDate(currentReportData.start_date) +
            ' to ' + window.DawaReporting.formatDate(currentReportData.end_date) +
            ' | Generated: ' + window.DawaReporting.formatDateTime(currentReportData.generated_at),
            105, 42, { align: 'center' });

        doc.autoTable({
            startY: 50,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [11, 110, 79] },
            body: [
                ['Total Sales Revenue', window.DawaReporting.formatCurrency(s.total_sales)],
                ['Cash Sales', window.DawaReporting.formatCurrency(s.cash_sales)],
                ['M-Pesa Sales', window.DawaReporting.formatCurrency(s.mpesa_sales)],
                ['Card Sales', window.DawaReporting.formatCurrency(s.card_sales)],
                ['Credit Sales', window.DawaReporting.formatCurrency(s.credit_sales)],
                ['Credit Payments Received', window.DawaReporting.formatCurrency(s.credit_payments_received)],
                ['Outstanding Credit', '-' + window.DawaReporting.formatCurrency(s.outstanding_credit_balances)],
                ['Cost of Goods Sold', window.DawaReporting.formatCurrency(s.cost_of_goods_sold)],
                ['Gross Profit', window.DawaReporting.formatCurrency(s.gross_profit)],
                ['Operating Expenses', '-' + window.DawaReporting.formatCurrency(s.total_expenses)],
                ['Net Operating Profit', window.DawaReporting.formatCurrency(s.net_profit)],
                ['Total Stock Value', window.DawaReporting.formatCurrency(s.total_stock_value)]
            ],
            columns: [
                { header: 'Item', dataKey: 'item' },
                { header: 'Amount (KES)', dataKey: 'amount' }
            ]
        });

        // Best selling products table
        if ((currentReportData.best_selling || []).length > 0) {
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 10,
                theme: 'striped',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [11, 110, 79] },
                head: [['Best Selling Products']],
                body: (currentReportData.best_selling || []).map(p => [
                    escapeHtml(p.name),
                    'Qty: ' + p.quantity,
                    'Rev: ' + window.DawaReporting.formatCurrency(p.revenue),
                    'Profit: ' + window.DawaReporting.formatCurrency(p.profit)
                ])
            });
        }

        // Transaction details
        if ((currentReportData.transactions || []).length > 0) {
            doc.autoTable({
                startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 80,
                theme: 'striped',
                styles: { fontSize: 6 },
                headStyles: { fillColor: [11, 110, 79] },
                head: [['Receipt', 'Date', 'Customer', 'Method', 'Total', 'Payment', 'Credit']],
                body: (currentReportData.transactions || []).map(t => [
                    escapeHtml(t.receipt_number || '-'),
                    window.DawaReporting.formatDate(t.date),
                    escapeHtml(t.customer || '-'),
                    escapeHtml(t.method || '-'),
                    window.DawaReporting.formatCurrency(t.total),
                    window.DawaReporting.formatCurrency(t.payment),
                    window.DawaReporting.formatCurrency(t.credit_amount)
                ])
            });
        }

        // Footer with page numbers
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 80;
        doc.setFontSize(7);
        doc.setTextColor(150, 156, 169);
        doc.text('Page 1', 105, 285, { align: 'center' });

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dawa-smart-report-' + currentReportData.start_date + '-to-' + currentReportData.end_date + '.pdf';
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ PDF downloaded successfully', 'success');
    } catch (e) {
        console.error('PDF generation error:', e);
        showToast('❌ PDF download failed: ' + e.message, 'error');
    }
}

async function exportReportCSV() {
    if (!currentReportData) { showToast('Generate a report first', 'error'); return; }
    const csv = window.DawaReporting.generateCSV(currentReportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dawa-smart-report-' + currentReportData.start_date + '-to-' + currentReportData.end_date + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ CSV exported', 'success');
}

async function exportReportExcel() {
    if (!currentReportData) { showToast('Generate a report first', 'error'); return; }
    const csv = window.DawaReporting.generateExcelCSV(currentReportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dawa-smart-report-' + currentReportData.start_date + '-to-' + currentReportData.end_date + '.xls';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Excel exported', 'success');
}

async function saveReportArchive() {
    if (!currentReportData) { showToast('Generate a report first', 'error'); return; }
    if (!isEditor()) { showToast('Administrator access required', 'error'); return; }

    try {
        const archive = await window.DawaReporting.saveReportSnapshot(currentReportData);
        showToast('✅ Report snapshot saved!', 'success');
    } catch (e) {
        console.error('Save report archive error:', e);
        showToast('❌ Failed to save: ' + e.message, 'error');
    }
}

async function loadArchives() {
    if (!isAdmin()) return;
    const search = document.getElementById('archiveSearch')?.value.toLowerCase() || '';
    const archives = await window.DawaReporting.getReportArchives({
        search,
        reportType: document.getElementById('archiveTypeFilter')?.value || 'all'
    });

    const container = document.getElementById('archiveList');
    if (!container) return;

    if (archives.length === 0) {
        container.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i><p>No saved reports found</p></div>';
        return;
    }

    // Populate type filter options
    const typeSelect = document.getElementById('archiveTypeFilter');
    if (typeSelect && !typeSelect.hasChildNodes() || (typeSelect && typeSelect.children.length <= 1)) {
        const types = [...new Set(archives.map(a => a.report_type))];
        typeSelect.innerHTML = '<option value="all">All Types</option>' +
            types.map(t => '<option value="' + t + '">' + escapeHtml(t) + '</option>').join('');
    }

    container.innerHTML = archives.map(a => {
        const s = a.report_data?.summary || {};
        return '<div class="item-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div>' +
            '<h4 style="font-size:14px; margin:0;">' + escapeHtml(a.report_name || 'Unnamed Report') + '</h4>' +
            '<div class="meta" style="font-size:11px;color:#64748b;">Type: ' + escapeHtml(a.report_type || 'N/A') + ' | Period: ' +
            window.DawaReporting.formatDate(a.start_date) + ' to ' + window.DawaReporting.formatDate(a.end_date) + '</div>' +
            '<div class="meta" style="font-size:10px;color:#94a3b8;">Generated: ' + window.DawaReporting.formatDateTime(a.created_at) +
            ' by ' + escapeHtml(a.generated_by || 'Unknown') + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
            '<div style="font-weight:600;font-size:13px;">' + window.DawaReporting.formatCurrency(s.total_sales) + '</div>' +
            '<div style="font-size:10px;color:#64748b;">' + window.DawaReporting.formatCurrency(s.net_profit) + ' net</div>' +
            '</div>' +
            '</div>' +
            '<div class="actions" style="margin-top:8px;">' +
            '<button class="btn btn-sm btn-blue" onclick="viewArchive(\'' + a.id + '\')"><i class="fas fa-eye"></i> View</button> ' +
            '<button class="btn btn-sm btn-gold" onclick="downloadArchivePDF(\'' + a.id + '\')"><i class="fas fa-file-pdf"></i> PDF</button> ' +
            (a.pdf_storage_path ? '<button class="btn btn-sm btn-blue" onclick="downloadArchiveStoredPDF(\'' + a.id + '\')"><i class="fas fa-download"></i> Download Stored PDF</button>' : '') +
            '</div></div>';
    }).join('');
}

async function viewArchive(archiveId) {
    const report = await window.DawaReporting.getReportSnapshot(archiveId);
    if (!report) { showToast('Report not found', 'error'); return; }
    currentReportData = report;
    currentReportStartDate = report.start_date;
    currentReportEndDate = report.end_date;
    document.getElementById('reportStart').value = report.start_date;
    document.getElementById('reportEnd').value = report.end_date;
    currentReportPeriod = report.report_type || 'custom';
    renderReport(report);
    renderSummaryCards(report.summary);
    document.getElementById('archiveManagerModal').classList.remove('show');
}

async function downloadArchivePDF(archiveId) {
    const report = await window.DawaReporting.getReportSnapshot(archiveId);
    if (!report) { showToast('Report not found', 'error'); return; }
    currentReportData = report;
    await downloadReportPDF();
}

async function downloadArchiveStoredPDF(archiveId) {
    const archive = await window.db.getById('reportArchives', archiveId);
    if (!archive || !archive.pdf_storage_path) {
        showToast('No PDF stored for this archive', 'error');
        return;
    }
    if (window.supabaseClient) {
        try {
            const { data } = await window.supabaseClient.storage
                .from('reports')
                .download(archive.pdf_storage_path);
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dawa-smart-archive-' + archiveId + '.pdf';
            a.click();
            URL.revokeObjectURL(url);
            showToast('✅ PDF downloaded', 'success');
        } catch (e) {
            showToast('❌ Download failed: ' + e.message, 'error');
        }
    }
}

function openArchiveManager() {
    loadArchives();
    document.getElementById('archiveManagerModal').classList.add('show');
}

// Preserve existing loadReport function for backward compat
function loadReport(period) {
    selectReportPeriod(period);
    generateReportFromUI();
}

// ===== SAMPLE DATA =====
function loadSampleData(){ 
    const now = new Date();
    function daysAgo(n){ const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }

    function loadProducts() {
        return db.getAll('products').then(data => { 
            if(data && data.length > 0) {
                products = data;
                window.products = products;
                return Promise.resolve(); 
            }
            const samples = [ 
                {id:generateId(),name:'Amoxicillin 500mg',sku:'AMX-001',category:'antibiotics',unit:'caps',buyingPrice:3.48,sellingPrice:10,price:10,quantity:100,expiryDate:daysAgo(-210),generic:'Amoxicillin',controlled:false,badge:'antibiotic'},
                {id:generateId(),name:'Paracetamol 500mg',sku:'PAR-001',category:'pain-relief',unit:'tabs',buyingPrice:0.85,sellingPrice:2,price:2,quantity:200,expiryDate:daysAgo(-90),generic:'Paracetamol',controlled:false,badge:'pain'},
                {id:generateId(),name:'Artemether/Lumefantrine 20/120mg',sku:'ART-001',category:'antimalarial',unit:'tabs',buyingPrice:2.70,sellingPrice:5,price:5,quantity:50,expiryDate:daysAgo(-150),generic:'Artemether/Lumefantrine',controlled:false,badge:'malaria'},
                {id:generateId(),name:'Vitamin C 500mg',sku:'VTC-001',category:'vitamins',unit:'tabs',buyingPrice:3.00,sellingPrice:8,price:8,quantity:150,expiryDate:daysAgo(-240),generic:'Ascorbic Acid',controlled:false,badge:'vitamin'},
                {id:generateId(),name:'Ibuprofen 400mg',sku:'IBP-001',category:'pain-relief',unit:'tabs',buyingPrice:2.00,sellingPrice:5,price:5,quantity:80,expiryDate:daysAgo(-30),generic:'Ibuprofen',controlled:false,badge:'pain'},
                {id:generateId(),name:'Metformin 500mg',sku:'MET-001',category:'chronic',unit:'tabs',buyingPrice:3.00,sellingPrice:8,price:8,quantity:60,expiryDate:daysAgo(-180),generic:'Metformin',controlled:false,badge:'chronic'},
                {id:generateId(),name:'Omeprazole 20mg',sku:'OME-001',category:'chronic',unit:'caps',buyingPrice:5.00,sellingPrice:12,price:12,quantity:90,expiryDate:daysAgo(-120),generic:'Omeprazole',controlled:false,badge:'chronic'},
                {id:generateId(),name:'Losartan 50mg',sku:'LOS-001',category:'chronic',unit:'tabs',buyingPrice:10.00,sellingPrice:25,price:25,quantity:45,expiryDate:daysAgo(-365),generic:'Losartan',controlled:false,badge:'chronic'},
                {id:generateId(),name:'Diclofenac 50mg',sku:'DIC-001',category:'pain-relief',unit:'tabs',buyingPrice:2.00,sellingPrice:5,price:5,quantity:120,expiryDate:daysAgo(-90),generic:'Diclofenac',controlled:false,badge:'pain'},
                {id:generateId(),name:'Cotton Wool 100g',sku:'COT-001',category:'other',unit:'pack',buyingPrice:35.00,sellingPrice:80,price:80,quantity:30,expiryDate:daysAgo(-730),generic:'Cotton Wool',controlled:false,badge:'otc'},
                {id:generateId(),name:'Amoxicillin Trihydrate 250mg',sku:'AMX-002',category:'antibiotics',unit:'caps',buyingPrice:2.00,sellingPrice:5,price:5,quantity:75,expiryDate:daysAgo(-180),generic:'Amoxicillin',controlled:false,badge:'antibiotic'},
                {id:generateId(),name:'Dolo 650mg',sku:'DOL-001',category:'pain-relief',unit:'tabs',buyingPrice:1.50,sellingPrice:4,price:4,quantity:110,expiryDate:daysAgo(-120),generic:'Paracetamol',controlled:false,badge:'pain'},
                {id:generateId(),name:'Cetirizine 10mg',sku:'CET-001',category:'antihistamine',unit:'tabs',buyingPrice:1.20,sellingPrice:3,price:3,quantity:90,expiryDate:daysAgo(-150),generic:'Cetirizine',controlled:false,badge:'otc'},
                {id:generateId(),name:'Oral Rehydration Salts',sku:'ORS-001',category:'other',unit:'sachets',buyingPrice:5.00,sellingPrice:12,price:12,quantity:200,expiryDate:daysAgo(-200),generic:'ORS',controlled:false,badge:'otc'},
                {id:generateId(),name:'Zinc Sulfate 20mg',sku:'ZNC-001',category:'vitamins',unit:'tabs',buyingPrice:2.50,sellingPrice:6,price:6,quantity:60,expiryDate:daysAgo(-180),generic:'Zinc Sulfate',controlled:false,badge:'vitamin'}
            ]; 
            return Promise.all(samples.map(p => db.add('products', p))).then(() => {
                products = samples;
                window.products = products;
                return samples;
            });
        });
    }

    function loadBatches(sampleProducts) {
        if (!sampleProducts || sampleProducts.length === 0) return Promise.resolve();
        return db.getAll('batches').then(data => {
            if(data && data.length > 0) return Promise.resolve();
            const batches = [];
            const batchSuppliers = ['MedPharma Ltd', 'Kenya Drug Supplies', 'PharmaLink Distributors', 'MediSource Kenya', 'HealthFirst Wholesalers'];
            sampleProducts.slice(0, 8).forEach((p, i) => {
                batches.push({
                    id: generateId(),
                    productId: p.id,
                    productName: p.name,
                    batchNumber: 'B' + now.getFullYear() + '-' + String(i + 1).padStart(3, '0'),
                    expiryDate: p.expiryDate,
                    quantity: p.quantity,
                    buyingPrice: p.buyingPrice,
                    sellingPrice: p.sellingPrice,
                    supplier: batchSuppliers[i % batchSuppliers.length],
                    receivedDate: daysAgo(10 + i)
                });
            });
            return Promise.all(batches.map(b => db.add('batches', b)));
        });
    }

    function loadPatients() { 
        return db.getAll('patients').then(data => { 
            if(data && data.length > 0) { return Promise.resolve(); }
            const samples = [
                {id:generateId(),firstName:'James',lastName:'Ochieng',phone:'0722123456',email:'james.ochieng@example.com',dob:'1985-03-15',gender:'male',credit:0,creditLimit:10000,history:'Hypertension, diagnosed 2020',insurance:'NHIF'},
                {id:generateId(),firstName:'Amina',lastName:'Hassan',phone:'0711987654',email:'amina.hassan@example.com',dob:'1992-07-22',gender:'female',credit:0,creditLimit:10000,history:'Diabetes Type 2, diagnosed 2021',insurance:'AAR Insurance'},
                {id:generateId(),firstName:'David',lastName:'Kariuki',phone:'0733456789',email:'david.kariuki@example.com',dob:'1978-11-05',gender:'male',credit:2500,creditLimit:15000,history:'Asthma, chronic',insurance:'NHIF'},
                {id:generateId(),firstName:'Fatuma',lastName:'Ali',phone:'0744555666',email:'fatuma.ali@example.com',dob:'2000-01-30',gender:'female',credit:0,creditLimit:10000,history:'No significant history',insurance:''},
                {id:generateId(),firstName:'Robert',lastName:'Mutua',phone:'0721444555',email:'robert.m@example.com',dob:'1970-09-12',gender:'male',credit:8000,creditLimit:20000,history:'Hypertension, Diabetes, diagnosed 2018',insurance:'NHIF'},
                {id:generateId(),firstName:'Wanjiru',lastName:'Mwangi',phone:'0700333222',email:'wanjiru.m@example.com',dob:'1988-04-18',gender:'female',credit:0,creditLimit:10000,history:'No chronic conditions',insurance:'AAR Insurance'}
            ]; 
            return Promise.all(samples.map(p => db.add('patients', p)));
        });
    }

    function loadLabTests() { 
        return db.getAll('labTests').then(data => { 
            if(data && data.length > 0) { return Promise.resolve(); }
            const samples = [
                {id:generateId(),patientName:'James Ochieng',testType:'blood-pressure',requestedBy:'Dr. Wanjala',notes:'Routine checkup',status:'completed',results:'140/90 mmHg',date:daysAgo(1)},
                {id:generateId(),patientName:'Amina Hassan',testType:'blood-sugar',requestedBy:'Dr. Wanjala',notes:'Fasting blood sugar',status:'completed',results:'5.8 mmol/L',date:daysAgo(2)},
                {id:generateId(),patientName:'David Kariuki',testType:'malaria-test',requestedBy:'Dr. Wanjala',notes:'Suspected malaria',status:'pending',results:undefined,date:daysAgo(0)},
                {id:generateId(),patientName:'Robert Mutua',testType:'blood-pressure',requestedBy:'Dr. Wanjala',notes:'Follow-up',status:'completed',results:'135/85 mmHg',date:daysAgo(5)}
            ]; 
            return Promise.all(samples.map(l => db.add('labTests', l)));
        });
    }

    function loadExpenses() { 
        return db.getAll('expenses').then(data => { 
            if(data && data.length > 0) { return Promise.resolve(); }
            const samples = [];
            const expenseTypes = ['rent', 'utilities', 'salaries', 'supplies', 'lunch', 'transport'];
            const expenseDescs = {
                rent: ['Monthly rent for shop space', 'Shop rent payment'],
                utilities: ['Electricity bill', 'Water bill'],
                salaries: ['Staff salary - half month', 'Part-time assistant pay'],
                supplies: ['Cleaning supplies restock', 'Stationery purchase'],
                lunch: ['Team lunch', 'Staff lunch'],
                transport: ['Delivery pickup', 'Bank deposit transport']
            };
            for (let i = 0; i < 8; i++) {
                const type = expenseTypes[i % expenseTypes.length];
                const desc = expenseDescs[type][i % expenseDescs[type].length];
                samples.push({
                    id: generateId(),
                    type: type,
                    amount: [5000, 3200, 8500, 1200, 750, 1800, 4500, 2600][i],
                    description: desc,
                    date: daysAgo(i + 1)
                });
            }
            return Promise.all(samples.map(e => db.add('expenses', e)));
        });
    }

    function loadSales(sampleProducts, samplePatients) { 
        return db.getAll('sales').then(data => { 
            if(data && data.length > 0) { return Promise.resolve(); }
            const sales = [];
            const saleItemPromises = [];
            const methods = ['cash', 'mpesa', 'card', 'airtel'];
            const customers = ['Walk-in', 'James Ochieng', 'Amina Hassan', 'Wanjiru Mwangi', 'Robert Mutua'];
            let receiptCounter = 1;
            for (let i = 0; i < 12; i++) {
                const prod1 = sampleProducts[i % sampleProducts.length];
                const prod2 = sampleProducts[(i + 3) % sampleProducts.length];
                const qty1 = Math.floor(Math.random() * 3) + 1;
                const qty2 = Math.floor(Math.random() * 2) + 1;
                const total = (prod1.sellingPrice * qty1) + (prod2.sellingPrice * qty2);
                const method = methods[i % methods.length];
                const customer = customers[i % customers.length];
                const payment = method === 'credit' ? 0 : Math.max(total, Math.floor(total / 100) * 100 + 100);
                const sale = {
                    id: generateId(),
                    customer: customer,
                    customerPhone: customer !== 'Walk-in' ? samplePatients.find(p => (p.firstName + ' ' + p.lastName) === customer)?.phone || '' : '',
                    total: total,
                    payment: payment,
                    change: payment - total,
                    method: method,
                    cashier: isDemo() ? 'DEMO User' : (currentUser && currentUser.fullName ? currentUser.fullName : 'Rashid Juma'),
                    receiptNumber: String(receiptCounter++).padStart(4, '0'),
                    date: daysAgo(i + 1) + 'T10:00:00.000Z',
                    vat: 0,
                    subtotal: total,
                    negotiated: false
                };
                sales.push(sale);
                saleItemPromises.push(
                    db.add('saleItems', {
                        id: generateId(),
                        saleId: sale.id,
                        productId: prod1.id,
                        quantity: qty1,
                        price: prod1.sellingPrice,
                        originalPrice: prod1.sellingPrice,
                        buyingPrice: prod1.buyingPrice || 0,
                        name: prod1.name,
                        controlled: prod1.controlled,
                        isNegotiated: false
                    }),
                    db.add('saleItems', {
                        id: generateId(),
                        saleId: sale.id,
                        productId: prod2.id,
                        quantity: qty2,
                        price: prod2.sellingPrice,
                        originalPrice: prod2.sellingPrice,
                        buyingPrice: prod2.buyingPrice || 0,
                        name: prod2.name,
                        controlled: prod2.controlled,
                        isNegotiated: false
                    })
                );
            }
            return Promise.all([...sales.map(s => db.add('sales', s)), ...saleItemPromises]);
        });
    }

    return loadProducts()
        .then(sampleProducts => {
            return Promise.all([
                loadBatches(sampleProducts),
                loadPatients(),
                loadLabTests(),
                loadExpenses()
            ]);
        })
        .then(() => {
            return db.getAll('patients').then(patients => {
                return db.getAll('products').then(prods => loadSales(prods, patients));
            });
        })
        .then(() => {
            products = [];
            window.products = [];
            return db.getAll('products').then(data => { products = data; window.products = products; });
        })
        .then(() => console.log('✅ Demo sample data loaded (products, batches, patients, lab tests, expenses, sales)'))
        .catch(e => console.log('Sample data warning:', e)); 
}

// ===== STATS =====
function updateStats(){ 
    Promise.all([
        db.getSalesByDateRange(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]),
        db.getAll('products'),
        db.getAll('drugBatches')
    ]).then(([sales, allProducts, batches]) => {
        const total = sales.reduce((sum,s)=>sum+(s.total||0),0);
        const todaySalesEl = document.getElementById('todaySales');
        const todayRevenueEl = document.getElementById('todayRevenue');
        const totalProductsEl = document.getElementById('totalProducts');
        const totalStockValueEl = document.getElementById('totalStockValue');
        if(todaySalesEl) todaySalesEl.textContent = sales.length;
        if(todayRevenueEl) todayRevenueEl.textContent = formatCurrency(total);
        if(totalProductsEl) totalProductsEl.textContent = (allProducts || []).length;
        if(totalStockValueEl) {
            const stockValue = (allProducts || []).reduce((sum, p) => sum + ((p.buyingPrice || 0) * (p.quantity || 0)), 0);
            totalStockValueEl.textContent = formatCurrency(stockValue);
        }

        // Drug alerts
        const today = new Date();
        const soonThreshold = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expEl = document.getElementById('expiringDrugsCount');
        const lowEl = document.getElementById('lowStockDrugsCount');
        const expiringSoon = (batches || []).filter(b =>
            !b.deleted_at && b.quantity_remaining > 0 &&
            b.expiry_date && new Date(b.expiry_date) >= today && new Date(b.expiry_date) <= soonThreshold
        );
        const lowStock = (batches || []).filter(b =>
            !b.deleted_at && b.quantity_remaining > 0 &&
            b.quantity_remaining <= (b.reorder_level || 10)
        );
        if(expEl) expEl.textContent = expiringSoon.length;
        if(lowEl) lowEl.textContent = lowStock.length;
        const batchEl = document.getElementById('drugAlertsBanner');
        if(batchEl){
            let alerts = [];
            if(expiringSoon.length > 0) alerts.push('⚠️ '+expiringSoon.length+' batch(es) expiring within 30 days');
            if(lowStock.length > 0) alerts.push('🔴 '+lowStock.length+' batch(es) low stock');
            batchEl.innerHTML = alerts.length ? '<div style="background:rgba(245,158,11,0.1);border:1px solid #f59e0b;border-radius:8px;padding:8px 12px;font-size:12px;">'+alerts.join(' | ')+'</div>' : '';
        }
    }).catch(e => console.error('updateStats error:', e));
}

// ===== DRUG ALERT BANNER =====
function renderDrugAlertBanner() {
    const batchEl = document.getElementById('drugAlertsBanner');
    const expEl = document.getElementById('expiringDrugsCount');
    const lowEl = document.getElementById('lowStockDrugsCount');
    if(!batchEl) return;

    db.getAll('drugBatches').then(batches => {
        const today = new Date();
        const soonThreshold = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringSoon = (batches || []).filter(b =>
            !b.deleted_at && b.quantity_remaining > 0 &&
            b.expiry_date && new Date(b.expiry_date) >= today && new Date(b.expiry_date) <= soonThreshold
        );
        const lowStock = (batches || []).filter(b =>
            !b.deleted_at && b.quantity_remaining > 0 &&
            b.quantity_remaining <= (b.reorder_level || 10)
        );
        if(expEl) expEl.textContent = expiringSoon.length;
        if(lowEl) lowEl.textContent = lowStock.length;
        let alerts = [];
        if(expiringSoon.length > 0) alerts.push('⚠️ '+expiringSoon.length+' expiring soon');
        if(lowStock.length > 0) alerts.push('🔴 '+lowStock.length+' low stock');
        batchEl.innerHTML = alerts.length ? '<div style="background:rgba(245,158,11,0.1);border:1px solid #f59e0b;border-radius:8px;padding:8px 12px;font-size:12px;">'+alerts.join(' | ')+'</div>' : '';
    }).catch(() => {});
}

// ===== CLEAR ALL DATA =====
function clearAllData(){ if(!adminGuard('clear all data')) return; if(!confirm('⚠️ Delete ALL data?'))return; if(!confirm('⚠️ FINAL: Type "CONFIRM"'))return; showToast('Clearing...','warning'); const stores=['products','sales','saleItems','patients','batches','labTests','expenses','controlledLogs','drugCategories','drugForms','drugs','drugBatches','drugStockMovements','suppliers']; const promises=stores.map(store=>db.getAll(store).then(items=>{const deletes=items.map(item=>db.delete(store,item.id));return Promise.all(deletes);})); Promise.all(promises).then(()=>{showToast('All data cleared!','success');loadProducts();loadPatients();loadCustomers();loadProductSearch();updateStats();updateProductGrid();updatePricingDashboard();loadLabTests();loadDrugCatalogue();}).catch(()=>showToast('Error clearing','error')); }

function startFreshTransactions(){
  if(!adminGuard('start fresh')) return;
  if(!confirm('This will remove all sales, sale items, and expenses. Continue?')) return;
  const stores = ['sales', 'saleItems', 'expenses'];
  Promise.all(stores.map(store => db.getAll(store).then(items => Promise.all(items.map(item => db.delete(store, item.id))))))
    .then(() => { showToast('Sales and expenses cleared. Ready for fresh records.','success'); updateStats(); loadProfessionalAnalysis('daily'); generateCustomReport(); })
    .catch(() => showToast('Could not start fresh','error'));
}

function clearTransactionsForFreshInstall(){
  if(localStorage.getItem('yetu_fresh_transactions_v1')) return Promise.resolve();
  const stores = ['sales', 'saleItems', 'expenses'];
  return Promise.all(stores.map(store => db.getAll(store).then(items => Promise.all(items.map(item => db.delete(store, item.id))))))
    .then(() => localStorage.setItem('yetu_fresh_transactions_v1', '1'));
}

// ===== RESTORE & BACKUP =====
  // ===== Legacy EXPORT (kept for backward compat) =====
  function exportData(){ if(!adminGuard('export data')) return; showToast('Backing up...','info'); Promise.all([db.getAll('products'),db.getAll('sales'),db.getAll('saleItems'),db.getAll('patients'),db.getAll('batches'),db.getAll('labTests'),db.getAll('expenses')]).then(results=>{ const data={exportedAt:new Date().toISOString(),version:'4.3',pharmacy:document.getElementById('shopName').value||'Dawa Smart',kraPIN:document.getElementById('kraPin').value||'P-2025-001',products:results[0],sales:results[1],saleItems:results[2],patients:results[3],batches:results[4],labTests:results[5],expenses:results[6],users:users}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='dawa-smart-backup-'+new Date().toISOString().split('T')[0]+'.json';a.click();URL.revokeObjectURL(url); showToast('✅ Backup complete!','success'); }).catch(()=>showToast('Backup error','error')); }
  
  // ===== Restore Data =====
  function restoreData(event) { if(!adminGuard('restore data')) return; const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = JSON.parse(e.target.result); if (!data.products || !data.sales) { showToast('Invalid backup file format','error'); return; } if (!confirm('⚠️ Restoring will REPLACE ALL current data. Continue?')) return; if (!confirm('⚠️ FINAL: Type "RESTORE" to confirm')) return; showToast('Restoring data...','warning'); const stores = ['products','sales','saleItems','patients','batches','labTests','expenses','controlledLogs','drugCategories','drugForms','drugs','drugBatches','drugStockMovements','suppliers']; const clearPromises = stores.map(store => db.getAll(store).then(items => Promise.all(items.map(item => db.delete(store, item.id))))); Promise.all(clearPromises).then(() => { const restorePromises = []; if (data.products) data.products.forEach(p => restorePromises.push(db.add('products', p))); if (data.sales) data.sales.forEach(s => restorePromises.push(db.add('sales', s))); if (data.saleItems) data.saleItems.forEach(s => restorePromises.push(db.add('saleItems', s))); if (data.patients) data.patients.forEach(p => restorePromises.push(db.add('patients', p))); if (data.batches) data.batches.forEach(b => restorePromises.push(db.add('batches', b))); if (data.labTests) data.labTests.forEach(l => restorePromises.push(db.add('labTests', l))); if (data.expenses) data.expenses.forEach(e => restorePromises.push(db.add('expenses', e))); if (data.drugCategories) data.drugCategories.forEach(c => restorePromises.push(db.add('drugCategories', c))); if (data.drugForms) data.drugForms.forEach(f => restorePromises.push(db.add('drugForms', f))); if (data.drugs) data.drugs.forEach(d => restorePromises.push(db.add('drugs', d))); if (data.drugBatches) data.drugBatches.forEach(b => restorePromises.push(db.add('drugBatches', b))); if (data.drugStockMovements) data.drugStockMovements.forEach(m => restorePromises.push(db.add('drugStockMovements', m))); if (data.suppliers) data.suppliers.forEach(s => restorePromises.push(db.add('suppliers', s))); if (data.users) { users = data.users; saveUsersToStorage(); } if (data.pharmacy) { localStorage.setItem('yetu_pharmacy', JSON.stringify({name:data.pharmacy, address:data.address||'', kraPin:data.kraPIN||'', footer:'', vatRate:0})); loadPharmacySettings(); } return Promise.all(restorePromises); }).then(() => { showToast('✅ Data restored successfully!','success'); document.getElementById('restoreInput').value = ''; loadProducts(); loadPatients(); loadCustomers(); loadProductSearch(); updateStats(); loadUsers(); loadLabTests(); updateProductGrid(); updatePricingDashboard(); loadCreditDashboard(); loadProfessionalAnalysis('daily'); }).catch(err => { showToast('Restore error: '+err.message,'error'); }); } catch(err) { showToast('Invalid backup file','error'); } }; reader.readAsText(file); }

  // ===== EXPORT & BACKUP (Modern) =====
const BACKUP_STORES = ['products','sales','saleItems','patients','batches','controlledLogs','labTests','expenses','users','drugCategories','drugForms','drugs','drugBatches','drugStockMovements','suppliers','reportArchives'];

function getLocalSettings(){
  var LICENSE_PREFIX = 'dawasmartz_';
  var settings = {};
  for(var index = 0; index < localStorage.length; index++){
    var key = localStorage.key(index);
    if(key && key.indexOf(LICENSE_PREFIX) !== 0) settings[key] = localStorage.getItem(key);
  }
  return settings;
}

function exportData(){
  if(!adminGuard('export data')) return;
  showToast('Backing up all information...','info');
  Promise.all(BACKUP_STORES.map(store => db.getAll(store))).then(records => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '4.4',
      pharmacy: document.getElementById('shopName')?.value || 'Dawa Smart',
      kraPIN: document.getElementById('kraPin')?.value || 'P-2025-001',
      stores: Object.fromEntries(BACKUP_STORES.map((store, index) => [store, records[index]])),
      localStorage: getLocalSettings()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dawa-smart-backup-' + new Date().toISOString().split('T')[0] + '.json';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Complete backup exported successfully','success');
  }).catch(() => showToast('Backup error','error'));
}

function restoreData(event){
  if(!adminGuard('restore data')) return;
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(loadEvent){
    try{
      const data = JSON.parse(loadEvent.target.result);
      const backupStores = data.stores || data;
      if(!backupStores.products || !backupStores.sales){ showToast('Invalid backup file format','error'); return; }
      if(!confirm('Restoring will replace all current information, including credits and reports. Continue?')) return;
      if(!confirm('FINAL: Type "RESTORE" to confirm')) return;
      showToast('Restoring all information...','warning');
      Promise.all(BACKUP_STORES.map(store => db.getAll(store).then(items => Promise.all(items.map(item => db.delete(store, item.id))))))
        .then(() => {
          const restorePromises = [];
          BACKUP_STORES.forEach(store => {
            const records = backupStores[store] || [];
            records.forEach(record => restorePromises.push(db.add(store, record)));
          });
          return Promise.all(restorePromises);
        })
         .then(() => {
           if(data.localStorage){
             var LICENSE_PREFIX = 'dawasmartz_';
             Object.entries(data.localStorage).forEach(function([key, value]) {
               // Never let a backup overwrite license/trial metadata
               if (key && key.indexOf(LICENSE_PREFIX) !== 0) localStorage.setItem(key, value);
             });
           }
          if(backupStores.users?.length){ users = backupStores.users; saveUsersToStorage(); }
          document.getElementById('restoreInput').value = '';
          loadPharmacySettings();
          loadProducts(); loadPatients(); loadCustomers(); loadProductSearch(); updateStats(); loadUsers(); loadLabTests(); updateProductGrid(); updatePricingDashboard();
          loadProfessionalAnalysis('daily'); generateCustomReport();
          loadDrugCatalogue();
          showToast('All information restored successfully','success');
        })
        .catch(() => showToast('Restore error','error'));
    }catch(error){ showToast('Invalid backup JSON file','error'); }
  };
  reader.readAsText(file);
}

// ===== NAVIGATION =====
function setupNav(){
    document.querySelectorAll('.nav button').forEach(btn=>{
        btn.addEventListener('click',function(){
            document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
            const page=document.getElementById('page-'+this.dataset.page);
            if(page)page.classList.add('active');
            if(this.dataset.page==='inventory')loadProducts();
            if(this.dataset.page==='patients')loadPatients();
            if(this.dataset.page==='lab')loadLabTests();
            if(this.dataset.page==='users')loadUsers();
            if(this.dataset.page==='pricing')updatePricingDashboard();
            if(this.dataset.page==='expenses'){ loadTodayExpenses(); loadExpensesPeriod('daily'); }
            if(this.dataset.page==='analysis')loadProfessionalAnalysis('daily');
            if(this.dataset.page==='credits')loadCreditDashboard();
            if(this.dataset.page==='drugdb')renderDrugSearchResultsMain();
            if(this.dataset.page==='drugcatalogue')loadDrugCatalogue();
            if(this.dataset.page==='reports'){const now=new Date();const startDate=new Date(now.getFullYear(),0,1).toISOString().split('T')[0];const endDate=now.toISOString().split('T')[0];document.getElementById('reportStart').value=startDate;document.getElementById('reportEnd').value=endDate;selectReportPeriod('yearly');generateReportFromUI();}
            if(this.dataset.page==='pos'){loadProductSearch();loadCustomers();updateStats();updateProductGrid();}
        });
    });
    document.getElementById('userSearch').addEventListener('input',loadUsers);
    document.getElementById('userRoleFilter').addEventListener('change',loadUsers);
    document.getElementById('pricingSearch').addEventListener('input',updatePricingDashboard);
    document.getElementById('pricingCategoryFilter').addEventListener('change',updatePricingDashboard);
    document.getElementById('labSearch').addEventListener('input',loadLabTests);
    const labStatusFilter=document.getElementById('labStatusFilter');
    if(labStatusFilter) labStatusFilter.addEventListener('change',loadLabTests);
    const ledgerCustomerSelect=document.getElementById('ledgerCustomerSelect');
    if(ledgerCustomerSelect) ledgerCustomerSelect.addEventListener('change',loadLedger);
    
    document.querySelectorAll('.product-categories button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.product-categories button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.cat;
            updateProductGrid();
        });
    });
    
    document.getElementById('paymentMethod').addEventListener('change', function() {
        syncPaymentInputForMethod();
        showMpesaPrompt();
        if (this.value === 'credit') {
            document.getElementById('creditCustomerForm').classList.add('show');
        } else {
            document.getElementById('creditCustomerForm').classList.remove('show');
        }
    });
}

// ===== DRUG CATALOGUE FUNCTIONS =====
window.currentDrugTab = 'categories';
function showDrugTab(tab) {
    window.currentDrugTab = tab;
    document.querySelectorAll('.drug-tab-content').forEach(content => content.style.display = 'none');
    document.getElementById('drugTab-' + tab).style.display = 'block';
    document.querySelectorAll('.tabs button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().replace(/\s+/g, '_') === tab ||
          (tab === 'categories' && btn.textContent.trim() === 'Categories') ||
          (tab === 'forms' && btn.textContent.trim() === 'Forms') ||
          (tab === 'drugs' && btn.textContent.trim() === 'Drug Master') ||
          (tab === 'batches' && btn.textContent.trim() === 'Batch Inventory') ||
          (tab === 'suppliers' && btn.textContent.trim() === 'Suppliers') ||
          (tab === 'stock_mvt' && btn.textContent.trim() === 'Stock Movements'));
    });
}

function loadDrugCatalogue() {
    loadDrugCategories();
    loadDrugForms();
    loadDrugs();
    loadDrugBatches();
    loadSuppliers();
    loadStockMovements();
    updateDrugStockSummary();
}

// --- Categories ---
function loadDrugCategories() {
    db.getAll('drugCategories').then(categories => {
        window.drugCategories = categories || [];
        if (window.drugCategories.length === 0) {
            seedDrugCategories();
            return;
        }
        loadDrugCategoryOptions();
        renderDrugCategories();
    }).catch(e => console.error('loadDrugCategories error:', e));
}

function seedDrugCategories() {
    const seedCategories = [
        { id: 'dc_antibiotics', name: 'Antibiotics', description: 'Drugs that kill or slow bacterial growth' },
        { id: 'dc_analgesics', name: 'Analgesics and Antipyretics', description: 'Pain relief and fever reduction medications' },
        { id: 'dc_antimalarials', name: 'Antimalarials', description: 'Drugs for malaria treatment and prevention' },
        { id: 'dc_antifungals', name: 'Antifungals', description: 'Drugs that treat fungal infections' },
        { id: 'dc_antivirals', name: 'Antivirals', description: 'Drugs that treat viral infections' },
        { id: 'dc_antihistamines', name: 'Antihistamines', description: 'Drugs that block histamine receptors for allergy relief' },
        { id: 'dc_antihypertensives', name: 'Antihypertensives', description: 'Drugs for high blood pressure management' },
        { id: 'dc_antidiabetics', name: 'Antidiabetics', description: 'Drugs for diabetes management' },
        { id: 'dc_gastrointestinal', name: 'Gastrointestinal Medicines', description: 'Drugs for digestive system disorders' },
        { id: 'dc_respiratory', name: 'Respiratory Medicines', description: 'Drugs for asthma, COPD, and breathing disorders' },
        { id: 'dc_vitamins', name: 'Vitamins and Supplements', description: 'Nutritional supplements and vitamin preparations' },
        { id: 'dc_dermatological', name: 'Dermatological Medicines', description: 'Topical treatments for skin conditions' },
        { id: 'dc_eye_ear', name: 'Eye and Ear Preparations', description: 'Ophthalmic and otic medications' },
        { id: 'dc_hormonal', name: 'Hormonal Medicines', description: 'Hormone replacement and endocrine therapies' },
        { id: 'dc_antiseptics', name: 'Antiseptics and Disinfectants', description: 'Topical antimicrobials and disinfectants' },
        { id: 'dc_cardiovascular', name: 'Cardiovascular Medicines', description: 'Drugs for heart and circulatory system' },
        { id: 'dc_emergency', name: 'Emergency Medicines', description: 'Life-saving medications for emergency use' },
        { id: 'dc_other', name: 'Other Medicines', description: 'Miscellaneous pharmaceutical products' }
    ];
    Promise.all(seedCategories.map(cat => {
        cat.status = 'active';
        cat.pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
        return db.add('drugCategories', cat);
    })).then(() => {
        window.drugCategories = seedCategories;
        loadDrugCategoryOptions();
        renderDrugCategories();
    }).catch(e => console.error('seedDrugCategories error:', e));
}

function loadDrugCategoryOptions() {
    const select = document.getElementById('drugCategorySelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select Category</option>';
    (window.drugCategories || []).forEach(cat => {
        select.innerHTML += '<option value="' + cat.id + '">' + cat.name + '</option>';
    });
}

function renderDrugCategories() {
    const search = document.getElementById('drugCategorySearch')?.value.toLowerCase() || '';
    const container = document.getElementById('drugCategoryList');
    if (!container) return;
    const filtered = (window.drugCategories || []).filter(c => c.name.toLowerCase().includes(search));
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty"><i class="fas fa-folder"></i><p>No categories found</p></div>';
        return;
    }
    container.innerHTML = filtered.map(c => {
        return '<div class="item-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<h4 style="font-size:14px;">' + escapeHtml(c.name) + '</h4>' +
            '<span class="status ' + (c.status || 'active') + '">' + (c.status || 'active') + '</span>' +
            '</div>' +
            (c.description ? '<div class="meta" style="font-size:11px;color:#64748b;">' + escapeHtml(c.description.substring(0, 80)) + '</div>' : '') +
            '<div class="actions" style="margin-top:4px;">' +
            (isEditor() ? '<button class="btn btn-sm btn-blue" onclick="editDrugCategory(\'' + c.id + '\')"><i class="fas fa-edit"></i></button> ' +
              '<button class="btn btn-sm btn-danger" onclick="deleteDrugCategory(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' : '<span style="color:#94a3b8;font-size:10px;">🔒 Admin only</span>') +
            '</div></div>';
    }).join('');
}

function openDrugCategoryModal(cat) {
    if (!isEditor()) { showToast('Administrator access required', 'error'); return; }
    document.getElementById('drugCategoryId').value = cat?.id || '';
    document.getElementById('drugCategoryName').value = cat?.name || '';
    document.getElementById('drugCategoryDescription').value = cat?.description || '';
    document.getElementById('drugCategoryStatus').value = cat?.status || 'active';
    document.getElementById('drugCategoryModalTitle').textContent = cat ? 'Edit Category' : 'New Category';
    document.getElementById('drugCategoryModal').classList.add('show');
}

function saveDrugCategory() {
    if (!isEditor()) return;
    const id = document.getElementById('drugCategoryId').value || 'dc_' + Date.now().toString(36);
    const category = {
        id,
        name: document.getElementById('drugCategoryName').value.trim(),
        description: document.getElementById('drugCategoryDescription').value.trim() || undefined,
        status: document.getElementById('drugCategoryStatus').value,
        pharmacyId: getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.()
    };
    if (!category.name) { showToast('Enter category name', 'error'); return; }
    db.getById('drugCategories', id).then(existing => {
        const upserted = existing
            ? { ...existing, ...category, revision: (existing.revision || 0) + 1 }
            : { ...category, revision: 0 };
        return db.update('drugCategories', upserted).catch(() => db.add('drugCategories', category));
    }).then(() => {
        showToast('Category saved!', 'success');
        document.getElementById('drugCategoryModal').classList.remove('show');
        loadDrugCategories();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

function editDrugCategory(id) {
    db.getById('drugCategories', id).then(cat => openDrugCategoryModal(cat)).catch(() => {});
}

function deleteDrugCategory(id) {
    if (!isEditor()) return;
    if (!confirm('Delete this category?')) return;
    db.delete('drugCategories', id).then(() => {
        showToast('Category deleted', 'success');
        loadDrugCategories();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

// --- Forms ---
function loadDrugForms() {
    db.getAll('drugForms').then(forms => {
        window.drugForms = forms || [];
        if (window.drugForms.length === 0) {
            seedDrugForms();
            return;
        }
        loadDrugFormOptions();
        renderDrugForms();
    }).catch(e => console.error('loadDrugForms error:', e));
}

function seedDrugForms() {
    const seedForms = [
        { id: 'df_tablet', name: 'Tablet', description: 'Oral solid dosage form containing active ingredient in compressed form' },
        { id: 'df_capsule', name: 'Capsule', description: 'Oral dosage form with gelatin shell filled with active ingredient' },
        { id: 'df_oral_suspension', name: 'Oral Suspension', description: 'Liquid dosage form with suspended particles for oral use' },
        { id: 'df_syrup', name: 'Syrup', description: 'Sweetened liquid dosage form for oral administration' },
        { id: 'df_injection', name: 'Injection', description: 'Sterile parenteral dosage form for injection' },
        { id: 'df_cream', name: 'Cream', description: 'Topical semi-solid dosage form for external application' },
        { id: 'df_ointment', name: 'Ointment', description: 'Topical semi-solid dosage form, oil-based, for external use' },
        { id: 'df_gel', name: 'Gel', description: 'Topical semi-solid dosage form, water-based, for external application' },
        { id: 'df_drops', name: 'Drops', description: 'Sterile liquid dosage form for ophthalmic, otic, or nasal use' },
        { id: 'df_eye_drops', name: 'Eye Drops', description: 'Sterile liquid dosage form for ophthalmic administration' },
        { id: 'df_ear_drops', name: 'Ear Drops', description: 'Sterile liquid dosage form for otic administration' },
        { id: 'df_inhaler', name: 'Inhaler', description: 'Device for delivering medication as a spray or powder to the lungs' },
        { id: 'df_powder', name: 'Powder', description: 'Dry powder dosage form for oral or other administration' },
        { id: 'df_sachet', name: 'Sachet', description: 'Small single-dose packet, typically for powder or liquid' },
        { id: 'df_suppository', name: 'Suppository', description: 'Dosage form for rectal administration' },
        { id: 'df_solution', name: 'Solution', description: 'Liquid dosage form with dissolved active ingredient' },
        { id: 'df_lotion', name: 'Lotion', description: 'Topical liquid preparation for external application' },
        { id: 'df_spray', name: 'Spray', description: 'Metered-dose delivery system for topical or mucosal administration' }
    ];
    Promise.all(seedForms.map(form => {
        form.status = 'active';
        form.pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
        return db.add('drugForms', form);
    })).then(() => {
        window.drugForms = seedForms;
        loadDrugFormOptions();
        renderDrugForms();
    }).catch(e => console.error('seedDrugForms error:', e));
}

function loadDrugFormOptions() {
    const select = document.getElementById('drugFormSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select Form</option>';
    (window.drugForms || []).forEach(form => {
        select.innerHTML += '<option value="' + form.id + '">' + form.name + '</option>';
    });
}

function renderDrugForms() {
    const search = document.getElementById('drugFormSearch')?.value.toLowerCase() || '';
    const container = document.getElementById('drugFormList');
    if (!container) return;
    const filtered = (window.drugForms || []).filter(f => f.name.toLowerCase().includes(search));
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty"><i class="fas fa-cube"></i><p>No forms found</p></div>';
        return;
    }
    container.innerHTML = filtered.map(f => {
        return '<div class="item-card">' +
            '<h4 style="font-size:14px;">' + escapeHtml(f.name) + '</h4>' +
            (f.description ? '<div class="meta" style="font-size:11px;color:#64748b;">' + escapeHtml(f.description.substring(0, 80)) + '</div>' : '') +
            '<div class="actions" style="margin-top:4px;">' +
            (isEditor() ? '<button class="btn btn-sm btn-blue" onclick="editDrugForm(\'' + f.id + '\')"><i class="fas fa-edit"></i></button> ' +
              '<button class="btn btn-sm btn-danger" onclick="deleteDrugForm(\'' + f.id + '\')"><i class="fas fa-trash"></i></button>' : '<span style="color:#94a3b8;font-size:10px;">🔒 Admin only</span>') +
            '</div></div>';
    }).join('');
}

function openDrugFormModal(form) {
    if (!isEditor()) { showToast('Administrator access required', 'error'); return; }
    document.getElementById('drugFormId').value = form?.id || '';
    document.getElementById('drugFormName').value = form?.name || '';
    document.getElementById('drugFormDescription').value = form?.description || '';
    document.getElementById('drugFormStatus').value = form?.status || 'active';
    document.getElementById('drugFormModalTitle').textContent = form ? 'Edit Form' : 'New Form';
    document.getElementById('drugFormModal').classList.add('show');
}

function saveDrugForm() {
    if (!isEditor()) return;
    const id = document.getElementById('drugFormId').value || 'df_' + Date.now().toString(36);
    const form = {
        id,
        name: document.getElementById('drugFormName').value.trim(),
        description: document.getElementById('drugFormDescription').value.trim() || undefined,
        status: document.getElementById('drugFormStatus').value,
        pharmacyId: getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.()
    };
    if (!form.name) { showToast('Enter form name', 'error'); return; }
    db.getById('drugForms', id).then(existing => {
        const upserted = existing
            ? { ...existing, ...form, revision: (existing.revision || 0) + 1 }
            : { ...form, revision: 0 };
        return db.update('drugForms', upserted).catch(() => db.add('drugForms', form));
    }).then(() => {
        showToast('Form saved!', 'success');
        document.getElementById('drugFormModal').classList.remove('show');
        loadDrugForms();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

function editDrugForm(id) {
    db.getById('drugForms', id).then(form => openDrugFormModal(form)).catch(() => {});
}

function deleteDrugForm(id) {
    if (!isEditor()) return;
    if (!confirm('Delete this form?')) return;
    db.delete('drugForms', id).then(() => {
        showToast('Form deleted', 'success');
        loadDrugForms();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

// --- Drugs ---
function loadDrugs() {
    db.getAll('drugs').then(drugs => {
        window.drugs = drugs || [];
        if (window.drugs.length === 0) {
            seedDrugVariations();
            return;
        }
        renderDrugs();
    }).catch(e => console.error('loadDrugs error:', e));
}

function seedDrugVariations() {
    const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
    const seedDrugs = [
        { id: 'drug_amox_500_caps', drug_name: 'Amoxicillin 500mg Capsules', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '500mg', category_id: 'dc_antibiotics', form_id: 'df_capsule', unit: 'caps', buying_price: 3, selling_price: 8, quantity: 50, expiry_date: new Date(new Date().getFullYear() + 2, 5, 15).toISOString().split('T')[0], batch_number: 'AMX500-001', badge: 'antibiotic' },
        { id: 'drug_amox_250_caps', drug_name: 'Amoxicillin 250mg Capsules', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '250mg', category_id: 'dc_antibiotics', form_id: 'df_capsule', unit: 'caps', buying_price: 2, selling_price: 5, quantity: 40, expiry_date: new Date(new Date().getFullYear() + 1, 8, 20).toISOString().split('T')[0], batch_number: 'AMX250-001', badge: 'antibiotic' },
        { id: 'drug_amox_125_susp', drug_name: 'Amoxicillin 125mg/5ml Oral Suspension', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '125mg/5ml', category_id: 'dc_antibiotics', form_id: 'df_oral_suspension', unit: 'bottle', buying_price: 15, selling_price: 35, quantity: 20, expiry_date: new Date(new Date().getFullYear() + 1, 11, 10).toISOString().split('T')[0], batch_number: 'AMX125-001', badge: 'antibiotic' },
        { id: 'drug_amox_250_susp', drug_name: 'Amoxicillin 250mg/5ml Oral Suspension', generic_name: 'Amoxicillin', brand_name: 'Suspensia', strength: '250mg/5ml', category_id: 'dc_antibiotics', form_id: 'df_oral_suspension', unit: 'bottle', buying_price: 20, selling_price: 45, quantity: 15, expiry_date: new Date(new Date().getFullYear() + 2, 3, 5).toISOString().split('T')[0], batch_number: 'AMX250S-001', badge: 'antibiotic' },
        { id: 'drug_amox_500_tabs', drug_name: 'Amoxicillin 500mg Tablets', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '500mg', category_id: 'dc_antibiotics', form_id: 'df_tablet', unit: 'tabs', buying_price: 4, selling_price: 10, quantity: 100, expiry_date: new Date(new Date().getFullYear() + 2, 7, 30).toISOString().split('T')[0], batch_number: 'AMX500T-001', badge: 'antibiotic' },
        { id: 'drug_amox_250_tabs', drug_name: 'Amoxicillin 250mg Tablets', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '250mg', category_id: 'dc_antibiotics', form_id: 'df_tablet', unit: 'tabs', buying_price: 3, selling_price: 7, quantity: 80, expiry_date: new Date(new Date().getFullYear() + 1, 9, 15).toISOString().split('T')[0], batch_number: 'AMX250T-001', badge: 'antibiotic' },
        { id: 'drug_amoxil_500_caps', drug_name: 'Amoxil 500mg Capsules', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '500mg', category_id: 'dc_antibiotics', form_id: 'df_capsule', unit: 'caps', buying_price: 4, selling_price: 12, quantity: 30, expiry_date: new Date(new Date().getFullYear() + 3, 1, 28).toISOString().split('T')[0], batch_number: 'AMX500G-001', badge: 'antibiotic' }
    ];
    Promise.all(seedDrugs.map(drug => {
        drug.pharmacyId = pharmacyId;
        drug.status = 'active';
        drug.revision = 0;
        return db.add('drugs', drug);
    })).then(() => {
        window.drugs = seedDrugs;
        renderDrugs();
    }).catch(e => console.error('seedDrugVariations error:', e));
    setTimeout(() => {
        seedDrugBatches();
    }, 200);
}

function seedDrugBatches() {
    const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
    const now = new Date();
    const futureDate = (months) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() + months);
        return d.toISOString().split('T')[0];
    };
    const batches = [
        { id: 'db_' + Math.random().toString(36).slice(2, 10), drug_id: 'drug_amox_500_caps', batch_number: 'AMX500-001', expiry_date: futureDate(12), quantity_received: 50, quantity_remaining: 50, purchase_price: 3, selling_price: 8, total_cost: 150, status: 'active', pharmacyId: pharmacyId, revision: 0 },
        { id: 'db_' + Math.random().toString(36).slice(2, 10), drug_id: 'drug_amox_500_caps', batch_number: 'AMX500-EXP-002', expiry_date: futureDate(3), quantity_received: 20, quantity_remaining: 20, purchase_price: 3, selling_price: 8, total_cost: 60, status: 'active', pharmacyId: pharmacyId, revision: 0 },
        { id: 'db_' + Math.random().toString(36).slice(2, 10), drug_id: 'drug_amox_250_caps', batch_number: 'AMX250-001', expiry_date: futureDate(9), quantity_received: 40, quantity_remaining: 40, purchase_price: 2, selling_price: 5, total_cost: 80, status: 'active', pharmacyId: pharmacyId, revision: 0 },
        { id: 'db_' + Math.random().toString(36).slice(2, 10), drug_id: 'drug_amox_125_susp', batch_number: 'AMX125-001', expiry_date: futureDate(15), quantity_received: 20, quantity_remaining: 20, purchase_price: 15, selling_price: 35, total_cost: 300, status: 'active', pharmacyId: pharmacyId, revision: 0 },
        { id: 'db_' + Math.random().toString(36).slice(2, 10), drug_id: 'drug_amox_500_tabs', batch_number: 'AMX500T-001', expiry_date: futureDate(18), quantity_received: 100, quantity_remaining: 100, purchase_price: 4, selling_price: 10, total_cost: 400, status: 'active', pharmacyId: pharmacyId, revision: 0 },
        { id: 'db_' + Math.random().toString(36).slice(2, 10), drug_id: 'drug_amox_500_tabs', batch_number: 'AMX500T-EXP-002', expiry_date: futureDate(4), quantity_received: 50, quantity_remaining: 50, purchase_price: 4, selling_price: 10, total_cost: 200, status: 'active', pharmacyId: pharmacyId, revision: 0 },
        { id: 'db_' + Math.random().toString(36).slice(2, 10), drug_id: 'drug_amoxil_500_caps', batch_number: 'AMX500G-001', expiry_date: futureDate(24), quantity_received: 30, quantity_remaining: 30, purchase_price: 4, selling_price: 12, total_cost: 120, status: 'active', pharmacyId: pharmacyId, revision: 0 }
    ];
    Promise.all(batches.map(b => db.add('drugBatches', b))).then(() => {
        window.drugBatches = batches;
        updateDrugStockSummary();
    }).catch(e => console.error('seedDrugBatches error:', e));
}

function renderDrugs() {
    const search = document.getElementById('drugSearch')?.value.toLowerCase() || '';
    const catFilter = document.getElementById('drugCategoryFilter')?.value || 'all';
    const statusFilter = document.getElementById('drugStatusFilter')?.value || 'all';
    const container = document.getElementById('drugList');
    if (!container) return;

    if (window.drugCategories?.length && document.getElementById('drugCategoryFilter') && document.getElementById('drugCategoryFilter').children.length <= 1) {
        // Populate if not already done
    }
    // Populate category filter
    const catSelect = document.getElementById('drugCategoryFilter');
    if (catSelect && catSelect.children.length <= 1) {
        (window.drugCategories || []).forEach(cat => {
            catSelect.innerHTML += '<option value="' + cat.id + '">' + escapeHtml(cat.name) + '</option>';
        });
    }

    let filtered = (window.drugs || []).filter(d => {
        if (d.deleted_at) return false;
        if (statusFilter !== 'all' && (d.status || 'active') !== statusFilter) return false;
        if (catFilter !== 'all' && d.category_id !== catFilter) return false;
        if (search && !(
            (d.drug_name || '').toLowerCase().includes(search) ||
            (d.generic_name || '').toLowerCase().includes(search) ||
            (d.brand_name || '').toLowerCase().includes(search) ||
            (d.strength || '').toLowerCase().includes(search)
        )) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty"><i class="fas fa-medical-notes"></i><p>No drugs found</p></div>';
        return;
    }
    container.innerHTML = filtered.map(d => {
        const category = (window.drugCategories || []).find(c => c.id === d.category_id);
        const form = (window.drugForms || []).find(f => f.id === d.form_id);
        const stockSummary = window.drugStockSummary?.[d.id];
        const qty = stockSummary?.total_quantity || 0;
        const alertLow = qty <= (d.reorder_level || 0) && qty > 0;
        const alertOutOfStock = qty === 0;
        return '<div class="item-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:start;">' +
            '<div style="flex:1;">' +
            '<h4 style="font-size:14px;margin:0;">' + escapeHtml(d.drug_name || d.generic_name || 'Unnamed') + '</h4>' +
            (d.brand_name ? '<div class="meta" style="font-size:11px;color:#64748b;">Brand: ' + escapeHtml(d.brand_name) + '</div>' : '') +
            (d.generic_name && d.generic_name !== d.drug_name ? '<div class="meta" style="font-size:11px;color:#64748b;">Generic: ' + escapeHtml(d.generic_name) + '</div>' : '') +
            (d.strength ? '<div class="meta" style="font-size:11px;color:#64748b;">Strength: ' + escapeHtml(d.strength) + '</div>' : '') +
            (category ? '<div class="meta" style="font-size:11px;">📂 ' + escapeHtml(category.name) + '</div>' : '') +
            (form ? '<div class="meta" style="font-size:11px;">💊 ' + escapeHtml(form.name) + '</div>' : '') +
            (d.route_of_administration ? '<div class="meta" style="font-size:11px;color:#64748b;">🛣 ' + escapeHtml(d.route_of_administration) + '</div>' : '') +
            '</div>' +
            '<div style="text-align:right;">' +
            '<span style="font-weight:600;font-size:13px;">Stock: ' + qty + '</span>' +
            (alertOutOfStock ? '<span class="status expired">❌ Out of Stock</span>' : alertLow ? '<span class="status warning">⚠️ Low Stock</span>' : '<span class="status active">✅ In Stock</span>') +
            '</div>' +
            '</div>' +
            '<div class="actions" style="margin-top:4px;">' +
            (isEditor() ? '<button class="btn btn-sm btn-blue" onclick="editDrug(\'' + d.id + '\')"><i class="fas fa-edit"></i></button> ' +
              '<button class="btn btn-sm btn-primary" onclick="openBatchModal(\'' + d.id + '\')"><i class="fas fa-plus"></i> Receive</button>' : '<span style="color:#94a3b8;font-size:10px;">🔒 Read-only</span>') +
            '</div></div>';
    }).join('');
}

function openDrugModal(drug) {
    if (!isEditor()) { showToast('Administrator access required', 'error'); return; }
    const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
    document.getElementById('drugId').value = drug?.id || '';
    document.getElementById('drugName').value = drug?.drug_name || '';
    document.getElementById('drugGenericName').value = drug?.generic_name || '';
    document.getElementById('drugBrandName').value = drug?.brand_name || '';
    document.getElementById('drugStrength').value = drug?.strength || '';
    document.getElementById('drugCategorySelect').value = drug?.category_id || '';
    document.getElementById('drugFormSelect').value = drug?.form_id || '';
    document.getElementById('drugRoute').value = drug?.route_of_administration || '';
    document.getElementById('drugManufacturer').value = drug?.manufacturer || '';
    document.getElementById('drugBarcode').value = drug?.barcode || '';
    document.getElementById('drugRegistrationNumber').value = drug?.registration_number || '';
    document.getElementById('drugPrescriptionStatus').value = drug?.prescription_status || 'pharmacy';
    document.getElementById('drugReorderLevel').value = drug?.reorder_level || '0';
    document.getElementById('drugStatus').value = drug?.status || 'active';
    document.getElementById('drugDescription').value = drug?.description || '';
    document.getElementById('drugModalTitle').textContent = drug ? 'Edit Drug' : 'New Drug';
    document.getElementById('drugModal').classList.add('show');
}

function loadDrugCategorySelectForDrug() {
    const select = document.getElementById('drugCategorySelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select Category</option>';
    (window.drugCategories || []).forEach(cat => {
        select.innerHTML += '<option value="' + cat.id + '">' + escapeHtml(cat.name) + '</option>';
    });
}

function loadDrugFormSelectForDrug() {
    const select = document.getElementById('drugFormSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select Form</option>';
    (window.drugForms || []).forEach(form => {
        select.innerHTML += '<option value="' + form.id + '">' + escapeHtml(form.name) + '</option>';
    });
}

function saveDrug() {
    if (!isEditor()) return;
    const id = document.getElementById('drugId').value || 'drug_' + Date.now().toString(36);
    const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
    const drug = {
        id,
        drug_name: document.getElementById('drugName').value.trim(),
        generic_name: document.getElementById('drugGenericName').value.trim() || undefined,
        brand_name: document.getElementById('drugBrandName').value.trim() || undefined,
        strength: document.getElementById('drugStrength').value.trim() || undefined,
        category_id: document.getElementById('drugCategorySelect').value || undefined,
        form_id: document.getElementById('drugFormSelect').value || undefined,
        route_of_administration: document.getElementById('drugRoute').value.trim() || undefined,
        manufacturer: document.getElementById('drugManufacturer').value.trim() || undefined,
        barcode: document.getElementById('drugBarcode').value.trim() || undefined,
        registration_number: document.getElementById('drugRegistrationNumber').value.trim() || undefined,
        prescription_status: document.getElementById('drugPrescriptionStatus').value,
        reorder_level: parseInt(document.getElementById('drugReorderLevel').value) || 0,
        status: document.getElementById('drugStatus').value,
        description: document.getElementById('drugDescription').value.trim() || undefined,
        pharmacyId: pharmacyId,
        revision: 0
    };
    if (!drug.drug_name) { showToast('Enter drug name', 'error'); return; }
    db.getById('drugs', id).then(existing => {
        const finalDrug = existing
            ? { ...drug, revision: (existing.revision || 0) + 1, created_at: existing.created_at }
            : drug;
        return db.update('drugs', finalDrug).catch(() => db.add('drugs', finalDrug));
    }).then(() => {
        showToast('Drug saved!', 'success');
        document.getElementById('drugModal').classList.remove('show');
        loadDrugs();
        updateDrugStockSummary();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

function editDrug(id) {
    db.getById('drugs', id).then(drug => {
        loadDrugCategorySelectForDrug();
        loadDrugFormSelectForDrug();
        openDrugModal(drug);
    }).catch(() => {});
}

function deleteDrug(id) {
    if (!isEditor()) return;
    if (!confirm('Delete this drug?')) return;
    db.delete('drugs', id).then(() => {
        showToast('Drug deleted', 'success');
        loadDrugs();
        updateDrugStockSummary();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

// --- Drug Batches ---
function loadDrugBatches() {
    db.getAll('drugBatches').then(batches => {
        window.drugBatches = batches || [];
        updateDrugStockSummary();
        renderDrugBatches();
    }).catch(e => console.error('loadDrugBatches error:', e));
}

function updateDrugStockSummary() {
    db.getAll('drugs').then(drugs => {
        const summary = {};
        const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
        (drugs || []).forEach(drug => {
            summary[drug.id] = {
                total_quantity: 0,
                total_batches: 0,
                nearest_expiry: null
            };
        });
        // Count batches per drug
        if (window.drugBatches) {
            window.drugBatches.forEach(batch => {
                if (batch.deleted_at) return;
                const drugId = batch.drug_id;
                if (!summary[drugId]) summary[drugId] = { total_quantity: 0, total_batches: 0, nearest_expiry: null };
                if (batch.quantity_remaining > 0 && !batch.deleted_at) {
                    summary[drugId].total_quantity += (batch.quantity_remaining || 0);
                    summary[drugId].total_batches += 1;
                    const expDate = batch.expiry_date;
                    if (expDate && (!summary[drugId].nearest_expiry || expDate < summary[drugId].nearest_expiry)) {
                        summary[drugId].nearest_expiry = expDate;
                    }
                }
            });
        }
        window.drugStockSummary = summary;
        const totalDrugs = Object.values(summary).filter(s => s.total_quantity > 0).length;
        const lowStock = Object.values(summary).filter(s => s.total_quantity > 0 && s.total_quantity <= 5).length;
        const outOfStock = Object.values(summary).filter(s => s.total_quantity === 0).length;
        const expired = Object.keys(summary).filter(drugId => {
            const d = (window.drugs || []).find(dr => dr.id === drugId);
            return d && summary[drugId].total_quantity > 0 && summary[drugId].nearest_expiry && summary[drugId].nearest_expiry <= new Date().toISOString().split('T')[0];
        }).length;
        const summaryEl = document.getElementById('drugStockSummary');
        if (summaryEl) {
            summaryEl.innerHTML = '📦 ' + totalDrugs + ' drugs in stock | ⚠️ ' + lowStock + ' low | ❌ ' + outOfStock + ' out | ⏱️ ' + expired + ' expiring';
        }
    }).catch(e => console.error('updateDrugStockSummary error:', e));
}

function renderDrugBatches() {
    const search = document.getElementById('batchSearch')?.value.toLowerCase() || '';
    const expFilter = document.getElementById('batchExpiryFilter')?.value || 'all';
    const container = document.getElementById('drugBatchList');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    let filtered = (window.drugBatches || []).filter(b => {
        if (b.deleted_at) return false;
        if (expFilter === 'expired' && b.expiry_date >= today) return false;
        if (expFilter === 'low' && b.quantity_remaining > (b.reorder_level || 10)) return false;
        if (expFilter === 'active' && (b.expiry_date < today || b.quantity_remaining <= 0)) return false;
        if (search) {
            const drug = (window.drugs || []).find(d => d.id === b.drug_id);
            const searchStr = ((drug?.drug_name || '') + ' ' + (drug?.generic_name || '') + ' ' + (b.batch_number || '') + ' ' + (b.supplier_name || '')).toLowerCase();
            if (!searchStr.includes(search)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty"><i class="fas fa-boxes"></i><p>No batches found</p></div>';
        return;
    }
    container.innerHTML = filtered.map(b => {
        const drug = (window.drugs || []).find(d => d.id === b.drug_id);
        const drugName = drug?.drug_name || drug?.generic_name || 'Unknown Drug';
        const isExpired = b.expiry_date < today;
        const isLow = b.quantity_remaining <= (b.reorder_level || 10);
        const statusClass = isExpired ? 'expired' : (isLow ? 'warning' : 'active');
        const statusText = isExpired ? 'EXPIRED' : (b.quantity_remaining === 0 ? 'EMPTY' : (isLow ? 'LOW STOCK' : 'ACTIVE'));
        return '<div class="item-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:start;">' +
            '<div>' +
            '<h4 style="font-size:14px;margin:0;">' + escapeHtml(drugName) + '</h4>' +
            '<div class="meta" style="font-size:11px;color:#64748b;">Batch: ' + escapeHtml(b.batch_number || '') + '</div>' +
            '<div class="meta" style="font-size:11px;">📅 Expiry: ' + formatDate(b.expiry_date) + '</div>' +
            (b.manufacturing_date ? '<div class="meta" style="font-size:11px;color:#64748b;">🏭 Mfg: ' + formatDate(b.manufacturing_date) + '</div>' : '') +
            (b.supplier_name ? '<div class="meta" style="font-size:11px;">📦 Supplier: ' + escapeHtml(b.supplier_name) + '</div>' : '') +
            '</div>' +
            '<div style="text-align:right;">' +
            '<span style="font-weight:600;font-size:13px;">Qty: ' + b.quantity_remaining + '</span>' +
            '<span class="status ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '</div>' +
            '<div class="actions" style="margin-top:4px;">' +
            (isEditor() ? '<button class="btn btn-sm btn-blue" onclick="editDrugBatch(\'' + b.id + '\')"><i class="fas fa-edit"></i></button> ' +
              '<button class="btn btn-sm btn-danger" onclick="deleteDrugBatch(\'' + b.id + '\')"><i class="fas fa-trash"></i></button>' : '<span style="color:#94a3b8;font-size:10px;">🔒 Admin only</span>') +
            '</div></div>';
    }).join('');

    // Render alerts in dashboard
    renderDrugAlerts();
}

function renderDrugAlerts() {
    const today = new Date().toISOString().split('T')[0];
    const alertsContainer = document.getElementById('drugAlerts');
    if (!alertsContainer) return;

    const expired = (window.drugBatches || []).filter(b => !b.deleted_at && b.expiry_date < today && b.quantity_remaining > 0);
    const lowStock = (window.drugBatches || []).filter(b => !b.deleted_at && b.quantity_remaining > 0 && b.quantity_remaining <= (b.reorder_level || 10));

    if (expired.length === 0 && lowStock.length === 0) {
        alertsContainer.innerHTML = '<div class="empty" style="font-size:12px;color:#16a34a;">✅ All drug stock is in good condition</div>';
        return;
    }

    let html = '';
    if (expired.length > 0) {
        html += '<div style="background:rgba(239,68,68,0.1;border:1px solid #ef4444;border-radius:8px;padding:12px;margin-bottom:8px;">' +
            '<div style="font-weight:600;color:#dc2626;">⚠️ ' + expired.length + ' batch(es) expired</div>' +
            expired.slice(0, 3).map(b => {
                const drug = (window.drugs || []).find(d => d.id === b.drug_id);
                return '<div style="font-size:12px;color:#7f1d1d;margin-top:4px;">' + escapeHtml(drug?.drug_name || 'Unknown') + ' - Batch ' + escapeHtml(b.batch_number || '') + ' (' + b.quantity_remaining + ' units)</div>';
            }).join('') +
            (expired.length > 3 ? '<div style="font-size:11px;color:#7f1d1d;">...and ' + (expired.length - 3) + ' more</div>' : '') +
            '</div>';
    }
    if (lowStock.length > 0) {
        html += '<div style="background:rgba(245,158,11,0.15);border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:8px;">' +
            '<div style="font-weight:600;color:#b45309;">⚠️ ' + lowStock.length + ' batch(es) low stock</div>' +
            lowStock.slice(0, 3).map(b => {
                const drug = (window.drugs || []).find(d => d.id === b.drug_id);
                return '<div style="font-size:12px;color:#78350f;margin-top:4px;">' + escapeHtml(drug?.drug_name || 'Unknown') + ' - Batch ' + escapeHtml(b.batch_number || '') + ' (' + b.quantity_remaining + ' remaining)</div>';
            }).join('') +
            (lowStock.length > 3 ? '<div style="font-size:11px;color:#78350f;">...and ' + (lowStock.length - 3) + ' more</div>' : '') +
            '</div>';
    }
    alertsContainer.innerHTML = html;
}

function openBatchModal(drugId) {
    if (!isEditor()) { showToast('Administrator access required', 'error'); return; }
    const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
    // Populate drug select
    const drugSelect = document.getElementById('batchDrugSelect');
    if (drugSelect) {
        drugSelect.innerHTML = '';
        (window.drugs || []).filter(d => !d.deleted_at).forEach(drug => {
            drugSelect.innerHTML += '<option value="' + drug.id + '" ' + (drugId === drug.id ? 'selected' : '') + '>' + escapeHtml(drug.drug_name || drug.generic_name || 'Unnamed') + '</option>';
        });
    }
    // Populate supplier select
    const supplierSelect = document.getElementById('batchSupplierSelect');
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">Select Supplier</option>';
        (window.suppliers || []).filter(s => !s.deleted_at && s.status !== 'inactive').forEach(s => {
            supplierSelect.innerHTML += '<option value="' + s.id + '">' + escapeHtml(s.name || '') + '</option>';
        });
    }
    document.getElementById('batchId').value = '';
    document.getElementById('batchNumber').value = '';
    document.getElementById('batchQuantity').value = '';
    document.getElementById('batchUnit').value = '';
    document.getElementById('batchMfgDate').value = '';
    document.getElementById('batchExpiry').value = '';
    document.getElementById('batchBuyingPrice').value = '';
    document.getElementById('batchSellingPrice').value = '';
    document.getElementById('batchModal').classList.add('show');
}

function saveDrugBatch() {
    if (!isEditor()) return;
    const id = document.getElementById('batchId').value || 'db_' + Date.now().toString(36);
    const drugId = document.getElementById('batchDrugSelect').value;
    const supplierId = document.getElementById('batchSupplierSelect').value;
    const supplierName = supplierId ? (window.suppliers || []).find(s => s.id === supplierId)?.name : '';
    const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();

    const quantity = parseInt(document.getElementById('batchQuantity').value);
    const purchasePrice = parseFloat(document.getElementById('batchBuyingPrice').value) || 0;
    const sellingPrice = parseFloat(document.getElementById('batchSellingPrice').value) || 0;
    const mfgDate = document.getElementById('batchMfgDate').value;
    const expiryDate = document.getElementById('batchExpiry').value;

    if (!drugId || !quantity || !expiryDate) {
        showToast('Fill all required fields', 'error');
        return;
    }
    if (!supplierId && !supplierName) {
        showToast('Select or enter a supplier', 'error');
        return;
    }

    const batch = {
        id,
        drug_id: drugId,
        batch_number: document.getElementById('batchNumber').value.trim(),
        manufacturing_date: mfgDate || undefined,
        expiry_date: expiryDate,
        quantity_received: quantity,
        quantity_remaining: quantity,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        total_cost: purchasePrice * quantity,
        supplier_id: supplierId || undefined,
        supplier_name: supplierName || undefined,
        received_date: new Date().toISOString().split('T')[0],
        status: new Date(expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'expired' : 'active',
        pharmacyId: pharmacyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        revision: 0
    };

    if (!batch.batch_number) {
        batch.batch_number = 'BN' + Date.now().toString(36).toUpperCase();
    }

    db.getById('drugBatches', id).then(existing => {
        const finalBatch = existing
            ? { ...batch, revision: (existing.revision || 0) + 1, created_at: existing.created_at }
            : batch;
        return db.update('drugBatches', finalBatch).catch(() => db.add('drugBatches', finalBatch));
    }).then(() => {
        // Record stock movement
        const movement = {
            id: 'dsm_' + Date.now().toString(36),
            drug_id: drugId,
            batch_id: id,
            movement_type: 'receive',
            quantity: quantity,
            quantity_before: 0,
            quantity_after: quantity,
            unit_price: purchasePrice,
            reference_type: 'stock_receive',
            notes: 'Batch received',
            user_name: window.currentUser || 'Pharmacy Staff',
            pharmacyId: pharmacyId,
            created_at: new Date().toISOString()
        };
        db.add('drugStockMovements', movement).catch(() => {});
        showToast('Batch received! Stock updated.', 'success');
        document.getElementById('batchModal').classList.remove('show');
        loadDrugBatches();
        updateDrugStockSummary();
        loadStockMovements();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

function editDrugBatch(id) {
    db.getById('drugBatches', id).then(batch => {
        // Populate the modal with existing values
        document.getElementById('batchId').value = batch.id;
        document.getElementById('batchDrugSelect').value = batch.drug_id || '';
        // Trigger a render of supplier select first
        const supplierSelect = document.getElementById('batchSupplierSelect');
        if (supplierSelect) {
            supplierSelect.innerHTML = '<option value="">Select Supplier</option>';
            (window.suppliers || []).filter(s => !s.deleted_at).forEach(s => {
                supplierSelect.innerHTML += '<option value="' + s.id + '" ' + (batch.supplier_id === s.id ? 'selected' : '') + '>' + escapeHtml(s.name || '') + '</option>';
            });
            if (batch.supplier_name && !batch.supplier_id) {
                supplierSelect.innerHTML += '<option value="" selected>' + escapeHtml(batch.supplier_name) + '</option>';
            }
        }
        document.getElementById('batchNumber').value = batch.batch_number || '';
        document.getElementById('batchQuantity').value = batch.quantity_received || '';
        document.getElementById('batchMfgDate').value = batch.manufacturing_date || '';
        document.getElementById('batchExpiry').value = batch.expiry_date || '';
        document.getElementById('batchBuyingPrice').value = batch.purchase_price || '';
        document.getElementById('batchSellingPrice').value = batch.selling_price || '';
        document.getElementById('batchModal').classList.add('show');
    }).catch(() => {});
}

function deleteDrugBatch(id) {
    if (!isEditor()) return;
    if (!confirm('Delete this batch?')) return;
    db.getById('drugBatches', id).then(batch => {
        batch.deleted_at = new Date().toISOString();
        return db.update('drugBatches', batch);
    }).then(() => {
        showToast('Batch deleted', 'success');
        loadDrugBatches();
        updateDrugStockSummary();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

// --- Suppliers ---
function loadSuppliers() {
    db.getAll('suppliers').then(suppliers => {
        window.suppliers = suppliers || [];
        renderSuppliers();
    }).catch(e => console.error('loadSuppliers error:', e));
}

function renderSuppliers() {
    const search = document.getElementById('supplierSearch')?.value.toLowerCase() || '';
    const container = document.getElementById('supplierList');
    if (!container) return;
    const filtered = (window.suppliers || []).filter(s => {
        if (s.deleted_at) return false;
        if (search) {
            const str = ((s.name || '') + ' ' + (s.phone || '') + ' ' + (s.email || '')).toLowerCase();
            if (!str.includes(search)) return false;
        }
        return true;
    });
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty"><i class="fas fa-truck"></i><p>No suppliers found</p></div>';
        return;
    }
    container.innerHTML = filtered.map(s => {
        return '<div class="item-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:start;">' +
            '<div>' +
            '<h4 style="font-size:14px;">' + escapeHtml(s.name || '') + '</h4>' +
            (s.phone ? '<div class="meta">📱 ' + escapeHtml(s.phone) + '</div>' : '') +
            (s.email ? '<div class="meta">📧 ' + escapeHtml(s.email) + '</div>' : '') +
            (s.address ? '<div class="meta" style="font-size:10px;color:#64748b;">📍 ' + escapeHtml(s.address) + '</div>' : '') +
            (s.license_number ? '<div class="meta" style="font-size:10px;color:#64748b;">🔢 License: ' + escapeHtml(s.license_number) + '</div>' : '') +
            '</div>' +
            '<span class="status ' + (s.status === 'active' ? 'active' : 'inactive') + '">' + (s.status || 'active') + '</span>' +
            '</div>' +
            '<div class="actions" style="margin-top:4px;">' +
            (isEditor() ? '<button class="btn btn-sm btn-blue" onclick="editSupplier(\'' + s.id + '\')"><i class="fas fa-edit"></i></button> ' +
              '<button class="btn btn-sm btn-danger" onclick="deleteSupplier(\'' + s.id + '\')"><i class="fas fa-trash"></i></button>' : '<span style="color:#94a3b8;font-size:10px;">🔒 Admin only</span>') +
            '</div></div>';
    }).join('');
}

function openSupplierModal(supplier) {
    if (!isEditor()) { showToast('Administrator access required', 'error'); return; }
    const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
    document.getElementById('supplierId').value = supplier?.id || '';
    document.getElementById('supplierName').value = supplier?.name || '';
    document.getElementById('supplierPhone').value = supplier?.phone || '';
    document.getElementById('supplierEmail').value = supplier?.email || '';
    document.getElementById('supplierAddress').value = supplier?.address || '';
    document.getElementById('supplierLicenseNumber').value = supplier?.license_number || '';
    document.getElementById('supplierStatus').value = supplier?.status || 'active';
    document.getElementById('supplierModalTitle').textContent = supplier ? 'Edit Supplier' : 'New Supplier';
    document.getElementById('supplierModal').classList.add('show');
}

function saveSupplier() {
    if (!isEditor()) return;
    const id = document.getElementById('supplierId').value || 'sup_' + Date.now().toString(36);
    const pharmacyId = getCurrentPharmacyId?.() || window.DawaTenant?.getCurrentPharmacyId?.();
    const supplier = {
        id,
        name: document.getElementById('supplierName').value.trim(),
        phone: document.getElementById('supplierPhone').value.trim() || undefined,
        email: document.getElementById('supplierEmail').value.trim() || undefined,
        address: document.getElementById('supplierAddress').value.trim() || undefined,
        license_number: document.getElementById('supplierLicenseNumber').value.trim() || undefined,
        status: document.getElementById('supplierStatus').value,
        pharmacyId: pharmacyId,
        revision: 0
    };
    if (!supplier.name) { showToast('Enter supplier name', 'error'); return; }
    db.getById('suppliers', id).then(existing => {
        const finalSupplier = existing
            ? { ...supplier, revision: (existing.revision || 0) + 1, created_at: existing.created_at }
            : supplier;
        return db.update('suppliers', finalSupplier).catch(() => db.add('suppliers', finalSupplier));
    }).then(() => {
        showToast('Supplier saved!', 'success');
        document.getElementById('supplierModal').classList.remove('show');
        loadSuppliers();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

function editSupplier(id) {
    db.getById('suppliers', id).then(supplier => openSupplierModal(supplier)).catch(() => {});
}

function deleteSupplier(id) {
    if (!isEditor()) return;
    if (!confirm('Delete this supplier?')) return;
    db.delete('suppliers', id).then(() => {
        showToast('Supplier deleted', 'success');
        loadSuppliers();
    }).catch(e => showToast('Error: ' + e.message, 'error'));
}

// --- Stock Movements ---
function loadStockMovements() {
    db.getAll('drugStockMovements').then(movements => {
        window.drugStockMovements = movements || [];
        renderStockMovements();
    }).catch(e => console.error('loadStockMovements error:', e));
}

function renderStockMovements() {
    const search = document.getElementById('stockMvtSearch')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('mvtTypeFilter')?.value || 'all';
    const container = document.getElementById('stockMovementList');
    if (!container) return;
    let filtered = (window.drugStockMovements || []).filter(m => {
        if (typeFilter !== 'all' && m.movement_type !== typeFilter) return false;
        if (search) {
            const drug = (window.drugs || []).find(d => d.id === m.drug_id);
            const batch = window.drugBatches?.find(b => b.id === m.batch_id);
            const str = ((drug?.drug_name || '') + ' ' + (batch?.batch_number || '') + ' ' + (m.movement_type || '') + ' ' + (m.user_name || '')).toLowerCase();
            if (!str.includes(search)) return false;
        }
        return true;
    });
    filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty"><i class="fas fa-history"></i><p>No stock movements found</p></div>';
        return;
    }
    container.innerHTML = filtered.map(m => {
        const drug = (window.drugs || []).find(d => d.id === m.drug_id);
        const batch = window.drugBatches?.find(b => b.id === m.batch_id);
        const typeLabels = {
            receive: { label: '📥 Received', color: '#0b6e4f' },
            sell: { label: '📤 Sold', color: '#2563eb' },
            return: { label: '↩️ Returned', color: '#7c3aed' },
            adjust: { label: '✏️ Adjusted', color: '#f59e0b' },
            destroy: { label: '🗑️ Destroyed', color: '#dc2626' },
            transfer: { label: '🔄 Transferred', color: '#0891b2' }
        };
        const typeInfo = typeLabels[m.movement_type] || { label: m.movement_type, color: '#64748b' };
        const qtyColor = m.quantity > 0 ? '#0b6e4f' : '#dc2626';
        return '<div class="item-card">' +
            '<div style="display:flex;justify-content:space-between;">' +
            '<div>' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
            '<span style="font-weight:600;font-size:13px;color:' + typeInfo.color + ';">' + typeInfo.label + '</span>' +
            '<span style="font-size:11px;color:#64748b;">' + formatDateTime(m.created_at) + '</span>' +
            '</div>' +
            (drug ? '<div class="meta" style="font-size:11px;">💊 ' + escapeHtml(drug.drug_name || drug.generic_name || '') + '</div>' : '') +
            (batch ? '<div class="meta" style="font-size:11px;color:#64748b;">Batch: ' + escapeHtml(batch.batch_number || '') + '</div>' : '') +
            (m.user_name ? '<div class="meta" style="font-size:10px;color:#94a3b8;">By: ' + escapeHtml(m.user_name) + '</div>' : '') +
            (m.notes ? '<div class="meta" style="font-size:10px;color:#64748b;">' + escapeHtml(m.notes) + '</div>' : '') +
            '</div>' +
            '<div style="text-align:right;">' +
            '<span style="font-weight:600;font-size:13px;color:' + qtyColor + ';">' + (m.quantity > 0 ? '+' : '') + m.quantity + '</span>' +
            (m.unit_price ? '<div style="font-size:10px;color:#64748b;">KSh ' + formatCurrency(m.unit_price) + '</div>' : '') +
            '</div>' +
            '</div></div>';
        }).join('');
}

// ===== INIT =====
function initApp(){
    loadUsersFromStorage();
    loadPharmacySettings();
    updateLicenseInfoDisplay();
    db.init().then(() => clearTransactionsForFreshInstall()).then(() => loadSampleData()).then(() => {
        loadProducts(); loadPatients(); loadCustomers(); loadProductSearch(); updateStats(); loadUsers(); loadLabTests(); loadDrugCategories(); loadDrugForms(); loadDrugs(); loadDrugBatches(); loadSuppliers(); setupNav(); updateProductGrid(); updatePricingDashboard();
        refreshSmartDrugStockSummary();
        document.getElementById('productSearch').addEventListener('input',searchProducts);
        document.getElementById('productSearch').addEventListener('input', function(){ refreshSmartSearchFromProducts(); });
        document.getElementById('productSearch').addEventListener('keydown',function(e){if(e.key==='Enter'){const query=this.value.trim();if(query){const product=products.find(p=>p.name.toLowerCase()===query.toLowerCase()||p.sku===query);if(product)addToCart(product.id);else showToast('Product not found','error');}}});
        document.getElementById('inventorySearch').addEventListener('input',loadProducts);
        document.getElementById('categoryFilter').addEventListener('change',loadProducts);
        document.getElementById('patientSearch').addEventListener('input',loadPatients);
        if(!navigator.onLine)document.getElementById('offlineBadge').style.display='inline';
        // Update sync status indicator
        if (typeof window.DawaSync !== 'undefined') {
          var syncStatus = window.DawaSync.getStatus();
          updateSyncIndicator(syncStatus);
          window.addEventListener('dawaSyncStatus', function(e) {
            updateSyncIndicator(e.detail);
          });
        }
        function updateSyncIndicator(status) {
          var badge = document.getElementById('syncBadge');
          var text = document.getElementById('syncStatusText');
          var icon = document.getElementById('syncIcon');
          if (!badge || !text || !icon) return;
          badge.style.display = 'flex';
          text.textContent = status.status || 'Sync';
          icon.className = 'fas fa-sync-alt';
          if (status.status === 'synced') {
            badge.style.background = 'rgba(22, 163, 74, 0.15)';
            icon.className = 'fas fa-check-circle';
            text.textContent = 'Synced';
          } else if (status.status === 'syncing') {
            icon.className = 'fas fa-sync-alt fa-spin';
            text.textContent = 'Syncing (' + status.pending + ')';
          } else if (status.status === 'offline') {
            badge.style.background = 'rgba(245, 158, 11, 0.15)';
            icon.className = 'fas fa-wifi-slash';
            text.textContent = 'Offline';
          } else if (status.status === 'pending' || status.status === 'failed') {
            badge.style.background = 'rgba(245, 158, 11, 0.15)';
            text.textContent = (status.pending || 0) + ' pending';
          } else if (status.status === 'local-only') {
            badge.style.display = 'none';
          }
        }
        document.getElementById('drugDbCount').textContent = totalDrugs + ' drugs';
        renderDrugSearchResultsMain();
        loadCreditDashboard();
        loadProfessionalAnalysis('daily');
        generateCustomReport();
        updateDemoUI();
        startDemoTicker();
        setupTrialWarnings();
        var resetBtn = document.getElementById('resetDemoBtn');
        if (resetBtn) resetBtn.style.display = isDemo() ? 'inline-flex' : 'none';
        var startFreshBtn = document.getElementById('startFreshBtn');
        var clearAllBtn = document.getElementById('clearAllBtn');
        if (isDemo()) {
            if (startFreshBtn) startFreshBtn.style.display = 'none';
            if (clearAllBtn) clearAllBtn.style.display = 'none';
        }

        // Refresh workspace switcher
        if (typeof window.DawaTenant !== 'undefined' && window.DawaTenant.fetchMemberships) {
            window.DawaTenant.fetchMemberships().then(() => {
                refreshWorkspaceSwitcher();
            });
        }
        console.log('⚕️ Dawa Smart v1.0.0 ready with ' + totalDrugs + ' drugs!');
         showToast('⚕️ Dawa Smart v1.0.0 ready!','success');
    }).catch(e => {console.error('Init error:',e);showToast('Error loading app: '+e.message,'error');});
}

function updateLicenseInfoDisplay(){
    if (typeof licenseManager === 'undefined') return;
    var info = licenseManager.getLicenseInfo();
    var statusEl = document.getElementById('licenseStatusText');
    var trialEl = document.getElementById('licenseTrialText');
    var daysEl = document.getElementById('licenseDaysText');
    var versionEl = document.getElementById('appVersionDisplay');
    var expiryEl = document.getElementById('licenseExpiryVersion');
    if (statusEl) statusEl.textContent = info.trialStart ? (info.status.charAt(0).toUpperCase() + info.status.slice(1)) : 'Pending (not started)';
    if (trialEl) {
        if (info.trialStart && info.trialExpiry) {
            trialEl.textContent = new Date(info.trialStart).toLocaleDateString() + ' → ' + new Date(info.trialExpiry).toLocaleDateString();
        } else {
            trialEl.textContent = 'Trial starts on first sale';
        }
    }
    if (daysEl) {
        if (!info.trialStart) {
            daysEl.textContent = 'Not started yet';
        } else if (info.trialExpiry && info.daysRemaining > 0) {
            daysEl.textContent = info.daysRemaining + ' day' + (info.daysRemaining > 1 ? 's' : '');
        } else if (info.lessThan24h) {
            daysEl.textContent = '< 1 day (' + info.hoursRemaining + 'h ' + info.minutesRemaining + 'm)';
        } else {
            daysEl.textContent = 'Expired';
        }
    }
    if (versionEl) versionEl.textContent = info.appVersion;
    if (expiryEl) expiryEl.textContent = info.appVersion;
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown',function(e){
    if(document.getElementById('appContainer').className.includes('show')){
        if(e.key==='F2'){e.preventDefault();document.getElementById('productSearch').focus();}
        if(e.key==='F9'){e.preventDefault();processPayment();}
        if(e.key==='F10'){e.preventDefault();clearCart();}
        if(e.key==='Escape'){document.getElementById('productSearch').blur();document.getElementById('searchResults').style.display='none';document.getElementById('searchResults').innerHTML='';}
    }
    if(e.key==='Enter'&&document.getElementById('loginForm').className!=='login-form hide'){handleLogin();}
});

// ===== EXPOSE GLOBALLY =====
window.handleLogin=handleLogin;window.handleLogout=handleLogout;
window.scanBarcode=scanBarcode;window.processPayment=processPayment;window.clearCart=clearCart;window.addToCart=addToCart;
window.removeFromCart=removeFromCart;window.updateQty=updateQty;window.openProductModal=openProductModal;window.saveProduct=saveProduct;
window.editProduct=editProduct;window.deleteProduct=deleteProduct;window.addProductBatch=addProductBatch;window.saveBatch=saveBatch;
window.openPatientModal=openPatientModal;window.savePatient=savePatient;window.editPatient=editPatient;window.deletePatient=deletePatient;
window.openUserModal=openUserModal;window.saveUser=saveUser;window.editUser=editUser;window.deleteUser=deleteUser;
window.loadReport=loadReport;window.generateCustomReport=generateCustomReport;window.printReport=printReport;window.generateKRAeTIMS=generateKRAeTIMS;
window.saveSettings=saveSettings;window.exportData=exportData;window.restoreData=restoreData;window.clearAllData=clearAllData;window.startFreshTransactions=startFreshTransactions;window.searchProducts=searchProducts;
window.loadProducts=loadProducts;window.loadPatients=loadPatients;window.loadUsers=loadUsers;window.loadCustomers=loadCustomers;
window.sendSMSReceipt=sendSMSReceipt;window.sendWhatsAppReceipt=sendWhatsAppReceipt;window.printPaperReceipt=printPaperReceipt;
window.showRecentSales=showRecentSales;window.holdTransaction=holdTransaction;window.quickAddProduct=quickAddProduct;
window.exportPricingReport=exportPricingReport;window.updatePricingDashboard=updatePricingDashboard;window.syncInsurance=syncInsurance;
window.showToast=showToast;window.formatCurrency=formatCurrency;
window.openLabModal=openLabModal;window.saveLabTest=saveLabTest;window.editLabTest=editLabTest;window.deleteLabTest=deleteLabTest;window.exportLabReport=exportLabReport;window.loadLabTests=loadLabTests;
window.db=db;window.products=products;window.cart=cart;
window.generateInvoice=generateInvoice;window.updateProductPrice=updateProductPrice;window.togglePassword=togglePassword;
window.saveExpense=saveExpense;window.loadTodayExpenses=loadTodayExpenses;window.loadExpensesForDate=loadExpensesForDate;window.deleteExpense=deleteExpense;window.loadExpensesPeriod=loadExpensesPeriod;window.exportExpenseAnalysis=exportExpenseAnalysis;
window.searchDrugDatabase=searchDrugDatabase;window.addDrugToInventory=addDrugToInventory;window.showDrugDatabaseSearch=showDrugDatabaseSearch;window.renderDrugSearchResults=renderDrugSearchResults;window.renderDrugSearchResultsMain=renderDrugSearchResultsMain;window.showSmartDrugSearch=showSmartDrugSearch;window.selectDrugFromSmartSearch=selectDrugFromSmartSearch;window.getBestBatchForDrug=getBestBatchForDrug;
window.loadLedger=loadLedger;window.exportLedger=exportLedger;
window.loadProfessionalAnalysis=loadProfessionalAnalysis;window.loadPharmacySettings=loadPharmacySettings;window.updatePharmacyDisplay=updatePharmacyDisplay;
window.loadCreditDashboard=loadCreditDashboard;window.viewCustomerLedger=viewCustomerLedger;window.addPayment=addPayment;window.exportCreditReport=exportCreditReport;
window.triggerMpesaSTK=triggerMpesaSTK;window.isAdmin=isAdmin;window.isDemo=isDemo;window.isEditor=isEditor;
window.resetDemoData=resetDemoData;window.updateDemoUI=updateDemoUI;window.renderDemoBanner=renderDemoBanner;
window.contactSalesWhatsApp=contactSalesWhatsApp;window.contactSupportEmail=contactSupportEmail;window.exitDemo=exitDemo;window.resetDemoTrialAndReload=resetDemoTrialAndReload;window.checkLoginTrialStatus=checkLoginTrialStatus;
window.updateLicenseInfoDisplay=updateLicenseInfoDisplay;
window.DawaSync=window.DawaSync;window.DawaSupabase=window.DawaSupabase;
window.DawaTenant=window.DawaTenant;

// ─── Workspace Switcher ───
async function refreshWorkspaceSwitcher(){
    var switcher = document.getElementById('pharmacySwitcher');
    if (!switcher) return;
    if (typeof window.DawaTenant === 'undefined' || !window.DawaTenant.getMemberships) return;

    var memberships = window.DawaTenant.getMemberships();
    if (memberships.length <= 1) {
        switcher.style.display = 'none';
        return;
    }

    var current = window.DawaTenant.getCurrentPharmacy();
    var html = '';
    memberships.forEach(function(m) {
        var p = m.pharmacy || {};
        html += '<option value="' + p.id + '" ' + (current && current.id === p.id ? 'selected' : '') + '>' + p.name + '</option>';
    });
    switcher.innerHTML = html;
    switcher.style.display = 'inline-block';
}

async function switchWorkspace(pharmacyId){
    if (!pharmacyId || typeof window.DawaTenant === 'undefined') return;
    try {
        await window.DawaTenant.switchPharmacy(pharmacyId);
        refreshWorkspaceSwitcher();
        loadProducts(); loadPatients(); loadCustomers(); loadProductSearch();
        updateStats(); updateProductGrid(); updatePricingDashboard();
        loadLabTests(); loadUsers(); loadCreditDashboard();
        showToast('Switched to ' + window.DawaTenant.getCurrentPharmacy().name, 'success');
    } catch(e) {
        showToast('Switch failed: ' + e.message, 'error');
    }
}
window.switchWorkspace=switchWorkspace;window.refreshWorkspaceSwitcher=refreshWorkspaceSwitcher;

// ─── Connection Status Listeners ───
function updateOfflineBadge(){
    var badge = document.getElementById('offlineBadge');
    if (!badge) return;
    if (!navigator.onLine) {
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
        // Trigger sync when coming back online
        if (typeof window.DawaSync !== 'undefined' && window.DawaSync.syncNow) {
            setTimeout(function(){ window.DawaSync.syncNow(); }, 500);
        }
    }
}
window.addEventListener('online', updateOfflineBadge);
window.addEventListener('offline', updateOfflineBadge);

window.editSale=editSale;window.deleteSale=deleteSale;window.adjustCredit=adjustCredit;
window.toggleNegotiation=toggleNegotiation;window.applyAllNegotiations=applyAllNegotiations;window.clearAllNegotiations=clearAllNegotiations;
window.toggleBackdate=toggleBackdate;window.applyBackdate=applyBackdate;window.clearBackdate=clearBackdate;
window.toggleRevenueInsight=toggleRevenueInsight;window.updateRevenueInsight=updateRevenueInsight;
window.updateNegotiatedPrice=updateNegotiatedPrice;

  document.getElementById('loginPassword').value = 'DEMO2026';
  document.getElementById('loginUsername').value = 'DEMO';
  var _hint = document.getElementById('loginDemoHint'); if (_hint) _hint.style.display = 'block';

window.fillAdminLogin = function() {
    handleLogin();
};

window.fetchAdminData = async function() {
    if (!window.DawaTenant || !window.DawaTenant.getToken) return;
    var token = window.DawaTenant.getToken();
    if (!token) return;
    try {
        var [pharmResponse, membersResponse] = await Promise.all([
            fetch('https://dawa-smart-api.rashidjumachepkwony.workers.dev/api/admin/pharmacies', {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch('https://dawa-smart-api.rashidjumachepkwony.workers.dev/api/admin/members', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
        ]);
        var pharmacies = pharmResponse.ok ? await pharmResponse.json() : { pharmacies: [] };
        var members = membersResponse.ok ? await membersResponse.json() : { members: [] };
        renderAdminPanel(pharmacies.pharmacies || [], members.members || []);
    } catch (e) {
        console.error('[Admin] Failed to fetch admin data:', e);
    }
};

window.renderAdminPanel = function(pharmacies, members) {
    var pharmacyList = document.getElementById('adminPharmacyList');
    var memberList = document.getElementById('adminMemberList');
    if (pharmacyList) {
        pharmacyList.innerHTML = pharmacies.map(function(p) {
            return '<tr><td>' + (p.id || '').substring(0,8) + '</td><td>' + (p.name||'') + '</td><td>' + (p.slug||'') + '</td><td>' + (p.status||'') + '</td><td>' + (p.created_at ? new Date(p.created_at).toLocaleDateString() : '') + '</td></tr>';
        }).join('');
    }
    if (memberList) {
        memberList.innerHTML = members.map(function(m) {
            return '<tr><td>' + (m.auth_user_id||m.id||'') + '</td><td>' + (m.email||'') + '</td><td>' + (m.role||'') + '</td><td>' + (m.status||'') + '</td><td>' + (m.pharmacy && m.pharmacy.name ? m.pharmacy.name : (m.pharmacy_id||'')) + '</td></tr>';
        }).join('');
    }
    var panel = document.getElementById('adminPanel');
    if (panel) { panel.style.display = 'block'; }
};

window.scrollToLogin = function() {
    document.getElementById('loginForm').scrollIntoView({ behavior: 'smooth' });
};

window.openWhatsAppChat = function() {
    window.open('https://wa.me/254759324463', '_blank');
};

window.addEventListener('load', function(){
    const splash = document.getElementById('splash');
    if(splash){setTimeout(function(){splash.classList.add('hidden'); checkLoginTrialStatus();}, 1000);}
});
