// Perguntas extraídas fielmente da Ficha de Anamnese para Lobuloplastia em
// papel — separado do renderizador de PDF (lib/documents/lobuloplastia.ts)
// pelo mesmo motivo de lib/documents/anamnese-questions.ts: esse último
// importa pdfkit, que não pode entrar no bundle do cliente.
export const LOBULOPLASTIA_HEALTH_QUESTIONS: { key: string; label: string }[] = [
  { key: "pregnant_lactating", label: "Gestante/Lactante?" },
  { key: "medical_treatment", label: "Está em tratamento médico?" },
  { key: "allergy", label: "Possui alergia?" },
  { key: "recent_surgery", label: "Cirurgia recente?" },
  { key: "cardiovascular", label: "Problemas cardiocirculatórios?" },
  { key: "smoker", label: "Tabagista?" },
  { key: "anemia", label: "Possui anemia?" },
  { key: "ate_last_24h", label: "Alimentou-se nas últimas 24 horas?" },
  { key: "controlled_medication", label: "Uso de medicamento controlado?" },
  { key: "diabetes", label: "Diabetes?" },
  { key: "seizures", label: "Histórico de convulsão?" },
  { key: "skin_scarring", label: "Problemas de pele ou cicatrização?" },
  { key: "infectious_disease", label: "Doença infectocontagiosa?" },
  { key: "dermatitis", label: "Histórico de dermatite?" },
  { key: "skin_cancer", label: "Câncer de pele?" },
  { key: "previous_aesthetic_treatments", label: "Outros tratamentos estéticos anteriores?" },
  { key: "previous_allergic_reaction", label: "Teve alguma reação alérgica durante ou após um procedimento?" },
  { key: "keloid", label: "Histórico de queloide?" },
];

// Texto exato passado pelo estúdio pro Termo de Consentimento — editável
// depois via a tabela form_texts (chave "lobuloplastia_consent_text"), sem
// precisar mexer em código; isso aqui é só o valor padrão enquanto ninguém
// customiza. Usado tanto na página pública de assinatura quanto no PDF
// gerado, pra garantir que o cliente lê exatamente o texto que vai assinar.
export const DEFAULT_LOBULOPLASTIA_CONSENT_TEXT = `Eu, abaixo identificado(a) e firmado(a), declaro ter sido informado(a) claramente e estar ciente sobre os benefícios, riscos, indicações, da aplicação de ácido estético. Os termos técnicos foram explicados e todas as minhas dúvidas foram esclarecidas pelo profissional que conduzirá todo o procedimento. Estou ciente de que aplicações de ácido estético na pele podem promover sensibilidade durante 1-7 dias depois da aplicação, sendo que descamação leve à moderada. Estou ciente ainda que possa ocorrer formação frost, uma reação de precipitação do ácido com as proteínas da pele. Após alguns dias, a região onde ocorre o frost pode ficar escurecida e formar crostas, essas crostas não devem ser retiradas, pois costumam cair naturalmente após 7 – 10 dias, e a pele que aparece por baixo da crosta é uma pele renovada. Comprometo-me a seguir corretamente todas as orientações e a fazer uso dos produtos da minha prescrição domiciliar respeitando os horários, quantidade e prazo para utilização dos mesmos, isentando neste ato os profissionais de estética envolvidos de qualquer culpa, caso o tratamento não dê certo por minha culpa exclusiva em caso de uso incorreto, pois tenho ciência de que esta obrigação de resultado está subordinada ao meu comportamento e disciplina durante e após o tratamento estético. Concordo espontaneamente em submeter-me ao referido tratamento, assumindo a responsabilidade e os riscos pelos eventuais efeitos indesejáveis decorrentes de indisciplina ou omissão de intolerância particular de minha pele às substâncias contidas nos produtos e que neste momento me foram informadas. Estou ciente que posso suspender este tratamento a qualquer momento, sem que este fato implique em qualquer forma de constrangimento entre eu e meu/minha profissional, que se dispõe a continuar me tratando em quaisquer circunstâncias relacionadas com sua categoria profissional. Assim, o faço por livre e espontânea vontade.`;
