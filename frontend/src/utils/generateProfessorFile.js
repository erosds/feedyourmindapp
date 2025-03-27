// generateProfessorsFile.js
const fs = require("fs");
const db = require("/postgres:4422@localhost:5432/school_management"); // Assicurati di importare correttamente il tuo modulo db

const generateProfessorsFile = async () => {
  try {
    const professors = await db.Professor.findAll({
      attributes: ["id", "first_name", "last_name"]
    });

    // Trasforma i dati in un formato comodo (ad esempio array di oggetti)
    const professorsData = professors.map(prof => ({
      id: prof.id,
      name: `${prof.first_name} ${prof.last_name}`
    }));

    // Scrivi il file JSON (ad esempio in una cartella "data" nel tuo progetto)
    fs.writeFileSync("./data/professors.json", JSON.stringify(professorsData, null, 2));
    console.log("File professors.json generato correttamente.");
  } catch (error) {
    console.error("Errore durante la generazione del file:", error);
  }
};

generateProfessorsFile();
