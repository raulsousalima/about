export interface Localized { pt: string; en: string }
export interface Experience {
  company: string; role: Localized; location: string
  start: string; end: string; current: boolean
  summary: Localized; achievements: Localized[]
}
export interface Education { school: string; degree: Localized; start: string; end: string }
export interface Certification { name: string; issuer: string; year: string }
export interface LangSkill { name: Localized; level: Localized }
export interface Header {
  name: string; headline: Localized; location: string
  email: string; phone: string; website: string; linkedin: string; github: string; photo: string
}
export interface ResumeData {
  header: Header; summary: Localized; experience: Experience[]
  education: Education[]; skills: { category: Localized; items: string[] }[]
  languages: LangSkill[]; certifications: Certification[]
}

const HEADER: Header = {
  name: 'Raul Lima',
  headline: {
    pt: 'Product Designer Specialist | Liderança em Product Design | Designer Engineer | AI-driven Product Design',
    en: 'Product Designer Specialist | Product Design Leadership | Designer Engineer | AI-driven Product Design',
  },
  location: 'São Paulo, Brazil',
  email: 'raul.sousa.work@gmail.com',
  phone: '',
  website: 'raullima.vercel.app',
  linkedin: 'linkedin.com/in/raullsousa',
  github: '',
  photo: '',
}

const SUMMARY_PT = `Product Designer com 15+ anos de experiência projetando e liderando produtos digitais em Fintech, Varejo, HealthTech, EdTech e IA.

Especializado em transformar desafios de negócio complexos em experiências digitais escaláveis e centradas no usuário, conectando estratégia de produto, pesquisa UX, design de interação, tecnologia e objetivos de negócio.

Ao longo da carreira, contribuí e liderei produtos digitais com 1M+ usuários, atuando em empresas como Banco Daycoval, Pernambucanas, Decathlon, Grupo RD Saúde, Faber-Castell e outras grandes organizações.`

const SUMMARY_EN = `Product Designer with 15+ years of experience designing and leading digital products across Fintech, Retail, HealthTech, EdTech and AI.

Experienced in transforming complex business challenges into scalable, user-centered digital experiences, connecting product strategy, UX research, interaction design, technology and business goals.

Throughout my career, I have contributed to and led digital products reaching 1M+ users, working with companies such as Banco Daycoval, Pernambucanas, Decathlon, Grupo RD Saúde, Faber-Castell and other large organizations.`

const KEY_ACHIEVEMENTS_PT: Localized[] = [
  { pt: 'Aumentou taxas de conversão em até 25% por meio de otimização de UX e redesign de funil.', en: 'Increased conversion rates by up to 25% through UX optimization and funnel redesign.' },
  { pt: 'Reduziu abandono de usuários em 30%+ simplificando jornadas complexas.', en: 'Reduced user drop-off by 30%+ by simplifying complex journeys.' },
  { pt: 'Melhorou a eficiência operacional em aproximadamente 20% por meio de soluções de autoatendimento e automação.', en: 'Improved operational efficiency by approximately 20% through self-service and automation solutions.' },
  { pt: 'Liderou experiências omnichannel em 6+ unidades de negócio, melhorando consistência e escalabilidade.', en: 'Led omnichannel experiences across 6+ business units, improving consistency and scalability.' },
]

const EXPERIENCE_DAYCOVAL: Experience = {
  company: 'Banco Daycoval',
  role: { pt: 'Product Designer Specialist', en: 'Product Designer Specialist' },
  location: 'São Paulo, Brazil · Presencial',
  start: '07/2025', end: '', current: true,
  summary: {
    pt: 'Atuando junto ao time de UX para fortalecer a cultura de experiência do usuário, a maturidade de design e as práticas de desenvolvimento de produto da organização.',
    en: 'Working within the UX team to strengthen the organization\'s user experience culture, design maturity and product development practices.',
  },
  achievements: [
    { pt: 'Liderança de iniciativas de UX e Product Design em experiências de banking digital.', en: 'Lead UX and Product Design initiatives across digital banking experiences.' },
    { pt: 'Design e melhoria de experiências para Pix, contas digitais, cartões de crédito e outros produtos financeiros.', en: 'Design and improve experiences for Pix, digital accounts, credit cards and other financial products.' },
    { pt: 'Aplicação de pesquisa UX, testes de usabilidade, benchmarking e análise de dados para apoiar decisões de produto.', en: 'Apply UX research, usability testing, benchmarking and data analysis to support product decisions.' },
    { pt: 'Estabelecimento e melhoria de metodologias UX, processos e práticas de testes de usabilidade.', en: 'Establish and improve UX methodologies, processes and usability testing practices.' },
    { pt: 'Parceria com times de Produto, Tecnologia e Negócios ao longo do ciclo de vida do produto.', en: 'Partner with Product, Technology and Business teams throughout the product lifecycle.' },
  ],
}

const EXPERIENCE_GOKK_COORD: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Coordenador de Product Design', en: 'Coordinator of Product Design' },
  location: 'São Paulo, Brazil · Híbrido',
  start: '07/2022', end: '', current: true,
  summary: {
    pt: 'Liderança e gestão de um time multidisciplinar de 14 Product Designers, apoiando múltiplos clientes, produtos e squads em diferentes contextos de negócio.',
    en: 'Lead and manage a multidisciplinary team of 14 Product Designers, supporting multiple clients, products and squads across different business contexts.',
  },
  achievements: [
    { pt: 'Liderança, mentoria e desenvolvimento de um time multidisciplinar de 14 Designers.', en: 'Lead, mentor and develop a multidisciplinary team of 14 Designers.' },
    { pt: 'Realização de 1:1s, sessões de feedback, desenvolvimento de carreira e gestão de performance.', en: 'Conduct 1:1s, feedback sessions, career development and performance management.' },
    { pt: 'Facilitação de cerimônias do time e suporte à colaboração entre Produto, Tecnologia e Negócios.', en: 'Facilitate team ceremonies and support collaboration across Product, Technology and Business.' },
    { pt: 'Promoção de compartilhamento de conhecimento, inovação e aprendizado contínuo.', en: 'Promote knowledge sharing, innovation and continuous learning.' },
    { pt: 'Apoio à maturidade e consistência de Design em diferentes organizações.', en: 'Support Design maturity and consistency across different organizations.' },
  ],
}

const EXPERIENCE_GOKK_LEADER: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Product Design Leader', en: 'Product Design Leader' },
  location: 'São Paulo, Brazil',
  start: '01/2017', end: '08/2022', current: false,
  summary: {
    pt: 'Liderança de um time multidisciplinar de 9 Designers em múltiplos produtos e squads. Projeto em destaque: Grupo RD Saúde — liderou time de quatro Designers no mapeamento de principais pontos de atrito em plataformas digitais, unificando sistemas e apoiando o refatoramento de ecossistemas digitais complexos.',
    en: 'Led a multidisciplinary team of 9 Designers across multiple products and squads. Featured project: Grupo RD Saúde — led a team of four Designers mapping major friction points across digital platforms, unifying systems and supporting the refactoring of complex digital ecosystems.',
  },
  achievements: [
    { pt: 'Liderança de time, mentoria e desenvolvimento de carreira.', en: 'Team leadership, mentoring and career development.' },
    { pt: '1:1s, feedback e acompanhamento individual de performance.', en: '1:1s, feedback and individual performance monitoring.' },
    { pt: 'Compartilhamento de conhecimento, workshops e iniciativas de inovação.', en: 'Knowledge sharing, workshops and innovation initiatives.' },
    { pt: 'Colaboração com stakeholders de Produto, Tecnologia e Negócios.', en: 'Collaboration with Product, Technology and Business stakeholders.' },
  ],
}

const EXPERIENCE_GOKK_SENIOR: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Senior Product Designer', en: 'Senior Product Designer' },
  location: 'São Paulo, Brazil',
  start: '01/2015', end: '12/2016', current: false,
  summary: {
    pt: 'Responsável por projetos end-to-end de Product Design em múltiplas indústrias e produtos digitais. Projetos: Pefisa / Pernambucanas (conta digital e serviços financeiros), Caixa Seguradoras (solução mobile para plano de saúde e odontológico), Stoneridge (rastreamento IoT de frotas nos EUA), Cenoura & Bronze (engajamento mobile), Positron (segurança veicular com geolocalização).',
    en: 'Responsible for end-to-end Product Design projects across multiple industries and digital products. Projects: Pefisa / Pernambucanas (digital account and financial services), Caixa Seguradoras (mobile health and dental insurance), Stoneridge (IoT fleet tracking, USA), Cenoura & Bronze (mobile engagement), Positron (vehicle security with geofencing).',
  },
  achievements: [
    { pt: 'Discovery → Definição → Pesquisa → Análise de Dados → Ideação → Prototipagem → Testes de Usabilidade → Implementação.', en: 'Discovery → Definition → Research → Data Analysis → Ideation → Prototyping → Usability Testing → Implementation.' },
    { pt: 'Pesquisa com usuários, desk research, definição de hipóteses, surveys e entrevistas, personas, jornadas, mapas de empatia.', en: 'User research, desk research, hypothesis definition, surveys and interviews, personas, customer journeys, empathy maps.' },
    { pt: 'Prototipagem de baixa e alta fidelidade, testes de usabilidade, testes A/B, suporte ao desenvolvimento e handoff.', en: 'Low and high-fidelity prototyping, usability testing, A/B testing, development support and design handoff.' },
  ],
}

const EXPERIENCE_GOKK_PD: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Product Designer', en: 'Product Designer' },
  location: 'São Paulo, Brazil',
  start: '01/2014', end: '12/2014', current: false,
  summary: {
    pt: 'Projetos: Spark (solução mobile e web para capas personalizadas de smartphone), Risqué (simulador mobile de esmalte e catálogo para promotoras).',
    en: 'Projects: Spark (mobile and web solution for personalized smartphone covers), Risqué (mobile nail polish simulator and product catalog for promoters).',
  },
  achievements: [],
}

const EXPERIENCE_PD_2013: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Product Designer', en: 'Product Designer' },
  location: 'São Paulo, Brazil',
  start: '01/2013', end: '12/2013', current: false,
  summary: {
    pt: 'Produtos digitais envolvendo IoT, aplicativos iOS e Android, web apps responsivos e tecnologias de geolocalização. Projeto em destaque: Porto Seguro — Assistente Tempo — solução para melhorar a logística de colaboradores durante o atendimento ao cliente usando geolocalização, melhorando a eficiência operacional.',
    en: 'Digital products involving IoT, iOS and Android applications, responsive web applications and geolocation technologies. Featured project: Porto Seguro — Tempo Assistant — solution to improve employee logistics during customer service using geolocation, improving operational efficiency.',
  },
  achievements: [],
}

const EXPERIENCE_DIGITAL_DESIGNER: Experience = {
  company: 'Digital Designer',
  role: { pt: 'Digital Designer', en: 'Digital Designer' },
  location: 'São Paulo, Brazil',
  start: '02/2012', end: '01/2013', current: false,
  summary: {
    pt: 'Design de produtos digitais e websites, direção de arte, desenvolvimento de conceitos e apresentações, design para redes sociais e comunicação digital.',
    en: 'Digital product and website design, art direction, concept development and presentations, social media design and digital communication.',
  },
  achievements: [],
}

const EXPERIENCE_ADPLIST: Experience = {
  company: 'ADPList',
  role: { pt: 'Mentor de Design', en: 'Design Mentor' },
  location: 'Remoto',
  start: '02/2022', end: '', current: true,
  summary: {
    pt: 'Mentoria para Product Designers e profissionais em transição para Design, com foco em: Carreira · Product Design · Processos de Design · Gestão · Liderança · Design Thinking.',
    en: 'Mentor Product Designers and professionals transitioning into Design, with a focus on: Career · Product Design · Design Processes · Management · Leadership · Design Thinking.',
  },
  achievements: [],
}

const EXPERIENCE_AWARI: Experience = {
  company: 'AWARI',
  role: { pt: 'Especialista em UI Design', en: 'UI Designer Specialist' },
  location: 'Remoto',
  start: '05/2022', end: '05/2023', current: false,
  summary: {
    pt: 'Instrutor com foco em UI Design, sistemas visuais, interfaces digitais e colaboração escalável em times Ágeis.',
    en: 'Instructor focused on UI Design, visual systems, digital interfaces and scalable collaboration within Agile teams.',
  },
  achievements: [],
}

const EDUCATION: Education[] = [
  {
    school: 'PUCRS — Pontifícia Universidade Católica do Rio Grande do Sul',
    degree: { pt: 'Pós-graduação — User Experience Design e Além', en: 'Postgraduate Degree — User Experience Design and Beyond' },
    start: '2023', end: '2024',
  },
  {
    school: 'UNINOVE — Universidade Nove de Julho',
    degree: { pt: 'Bacharelado — Comunicação Social & Publicidade e Propaganda', en: 'Bachelor\'s Degree — Social Communication & Advertising' },
    start: '2010', end: '2014',
  },
]

const SKILLS = [
  {
    category: { pt: 'Produto & Design', en: 'Product & Design' },
    items: ['Product Design', 'UX Design', 'UI Design', 'UX Strategy', 'Product Discovery', 'User Research', 'Interaction Design', 'Design Thinking', 'Design Systems', 'Service Design', 'Experience Design', 'User-Centered Design', 'Prototyping', 'Usability Testing'],
  },
  {
    category: { pt: 'Liderança', en: 'Leadership' },
    items: ['Design Leadership', 'Team Management', 'Career Development', 'Mentoring', 'Facilitation', 'Stakeholder Management', 'Cross-functional Collaboration', 'Conflict Resolution', 'Strategic Planning'],
  },
  {
    category: { pt: 'Dados & Produto', en: 'Data & Product' },
    items: ['Data-driven Design', 'Product Analytics', 'Research Analysis', 'Conversion Optimization', 'Customer Journey', 'Funnel Optimization', 'Business Strategy'],
  },
  {
    category: { pt: 'Tecnologia & IA', en: 'Technology & AI' },
    items: ['Figma', 'Figma MCP', 'Claude', 'Claude Code', 'Cursor', 'Antigravity', 'AI Agents', 'Generative AI', 'Rapid Prototyping', 'Adobe Creative Suite'],
  },
  {
    category: { pt: 'Metodologias', en: 'Methodologies' },
    items: ['Design Thinking', 'Lean UX', 'Agile UX', 'Agile', 'Product Discovery', 'Design Sprint', 'Research-driven Design'],
  },
  {
    category: { pt: 'Indústrias', en: 'Industries' },
    items: ['Fintech', 'Banking', 'Retail', 'HealthTech', 'EdTech', 'AI', 'E-commerce', 'IoT'],
  },
]

const LANGUAGES: LangSkill[] = [
  { name: { pt: 'Português', en: 'Portuguese' }, level: { pt: 'Nativo', en: 'Native' } },
  { name: { pt: 'Inglês', en: 'English' }, level: { pt: 'Profissional', en: 'Professional' } },
]

const CERTIFICATIONS: Certification[] = [
  { name: 'Marketing Digital, Design Thinking e UX', issuer: 'PUCRS', year: '2024' },
  { name: 'Strategic Leadership', issuer: 'CFCPro', year: '2024' },
  { name: 'Artificial Intelligence: Productivity & Career', issuer: 'Escola Conquer', year: '2024' },
  { name: 'English Certificate', issuer: 'International English Test', year: '2024' },
  { name: 'Customer Experience (CX)', issuer: 'Escola Conquer', year: '2023' },
  { name: 'Communication & Public Speaking', issuer: 'Evolive', year: '2023' },
  { name: 'Professional Adaptability: Emotional Intelligence, Personal Finance & Leadership', issuer: 'PUCRS', year: '2022' },
  { name: '100 Mentorship Minutes — Mentor', issuer: 'ADPList', year: '2022' },
  { name: 'Exponential Leadership', issuer: 'StartSe', year: '2021' },
  { name: 'Enterprise Design Thinking', issuer: 'IBM', year: '2021' },
  { name: 'Product Analytics Certification (PAC)', issuer: 'Product School', year: '2021' },
  { name: 'Global Designer Acceleration', issuer: 'Inter', year: '2021' },
  { name: 'Virtual Team Management', issuer: 'LinkedIn', year: '2020' },
  { name: 'Facilitation Experience', issuer: 'Echos Desirable Futures Lab', year: '2018' },
  { name: 'Design Thinking Experience', issuer: 'Echos Desirable Futures Lab', year: '2018' },
]

export function especialistaData(): ResumeData {
  return {
    header: { ...HEADER, headline: { pt: 'Product Designer Specialist · Fintech · Banking · AI-driven Product Design', en: 'Product Designer Specialist · Fintech · Banking · AI-driven Product Design' } },
    summary: {
      pt: SUMMARY_PT,
      en: SUMMARY_EN,
    },
    experience: [
      EXPERIENCE_DAYCOVAL,
      {
        ...EXPERIENCE_GOKK_COORD,
        summary: {
          pt: 'Gerenciamento de time de 14 Designers e entrega de projetos estratégicos para múltiplos clientes. Projeto em destaque: Decathlon — Club / Ready to Play — redesenho estratégico da experiência de uma das principais soluções digitais da empresa.',
          en: 'Managed a team of 14 Designers and delivered strategic projects for multiple clients. Featured project: Decathlon — Club / Ready to Play — strategic redesign of one of the company\'s key digital solutions.',
        },
        achievements: [
          { pt: 'Mapeamento da jornada do cliente existente e benchmarking de mercado.', en: 'Mapped the existing customer journey and conducted market benchmarking.' },
          { pt: 'Identificação de oportunidades e insights estratégicos.', en: 'Identified opportunities and strategic insights.' },
          { pt: 'Desenvolvimento de soluções UX do discovery até especificações e handoff para Tecnologia.', en: 'Developed UX solutions from discovery through specifications and technology handoff.' },
        ],
      },
      EXPERIENCE_GOKK_SENIOR,
      EXPERIENCE_GOKK_PD,
      EXPERIENCE_PD_2013,
      EXPERIENCE_DIGITAL_DESIGNER,
      EXPERIENCE_ADPLIST,
    ],
    education: EDUCATION,
    skills: SKILLS,
    languages: LANGUAGES,
    certifications: CERTIFICATIONS,
  }
}

export function coordenadorData(): ResumeData {
  return {
    header: { ...HEADER, headline: { pt: 'Coordenador de Product Design | Liderança de Times · Design Leadership · AI-driven Product Design', en: 'Coordinator of Product Design | Team Leadership · Design Leadership · AI-driven Product Design' } },
    summary: {
      pt: `${SUMMARY_PT}\n\nPrincipais impactos em liderança:\n• Gerenciamento e desenvolvimento de times de 5 a 15+ Designers.\n• Liderança de experiências omnichannel em 6+ unidades de negócio.\n• Mentoria de Designers em diferentes estágios de carreira.`,
      en: `${SUMMARY_EN}\n\nKey leadership impact:\n• Managed and developed Design teams of 5–15+ professionals.\n• Led omnichannel experiences across 6+ business units.\n• Mentored Designers at different career stages.`,
    },
    experience: [
      EXPERIENCE_GOKK_COORD,
      EXPERIENCE_DAYCOVAL,
      EXPERIENCE_GOKK_LEADER,
      EXPERIENCE_GOKK_SENIOR,
      EXPERIENCE_GOKK_PD,
      EXPERIENCE_ADPLIST,
      EXPERIENCE_AWARI,
    ],
    education: EDUCATION,
    skills: SKILLS,
    languages: LANGUAGES,
    certifications: CERTIFICATIONS,
  }
}
