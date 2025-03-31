// professorMapping.jsx
import professors from "./lista_prof_marzo_20252.json";

const getProfessorNameById = (id) => {
  const professor = professors.find((prof) => prof.id === id);
  return professor ? `${professor.first_name} ${professor.last_name}` : "altro prof";
};

export default getProfessorNameById;

