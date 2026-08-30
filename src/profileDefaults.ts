export interface Localized { pt: string; en: string }

export interface Experience {
  company: string; role: Localized; location: Localized
  start: string; end: string; current: boolean
  summary: Localized; achievements: Localized[]
}

export interface Education { school: string; degree: Localized; start: string; end: string }
export interface Certification { name: string; issuer: string; year: string }
export interface LangSkill { name: Localized; level: Localized }

export interface Header {
  name: string; headline: Localized; location: string
  email: string; phone: string
  website: string; linkedin: string; github: string; figma: string
  photo: string
}

export interface ResumeData {
  header: Header; summary: Localized; experience: Experience[]
  education: Education[]; skills: { category: Localized; items: string[] }[]
  languages: LangSkill[]; certifications: Certification[]
}

export interface LetterData {
  kind: 'letter'
  salutation: Localized
  company: string
  role: Localized
  body: Localized
  closing: Localized
}

/* ─── Shared base data ─────────────────────────────────────────────────── */

const HEADER: Header = {
  name: 'Raul Lima',
  headline: {
    pt: 'Product Designer Specialist | Product Design Leadership | Designer Engineer | AI-driven Product Design',
    en: 'Product Designer Specialist | Product Design Leadership | Designer Engineer | AI-driven Product Design',
  },
  location: 'São Paulo, Brazil',
  email: 'raul.sousa.work@gmail.com',
  phone: '',
  website: 'raullima.vercel.app',
  linkedin: 'linkedin.com/in/raullsousa',
  github: '',
  figma: '',
  photo: '',
}

const SUMMARY: Localized = {
  pt: `Product Designer com 15+ anos de experiência projetando e liderando produtos digitais em Fintech, Varejo, HealthTech, EdTech e IA.

Especializado em transformar desafios de negócio complexos em experiências digitais escaláveis e centradas no usuário, conectando estratégia de produto, pesquisa UX, design de interação, tecnologia e objetivos de negócio.

Ao longo da carreira, contribuí e liderei produtos digitais com 1M+ usuários, atuando em empresas como Banco Daycoval, Pernambucanas, Decathlon, Grupo RD Saúde, Faber-Castell e outras grandes organizações.`,

  en: `Product Designer with 15+ years of experience designing and leading digital products across Fintech, Retail, HealthTech, EdTech and AI.

Experienced in transforming complex business challenges into scalable, user-centered digital experiences, connecting product strategy, UX research, interaction design, technology and business goals.

Throughout my career, I have contributed to and led digital products reaching 1M+ users, working with companies such as Banco Daycoval, Pernambucanas, Decathlon, Grupo RD Saúde, Faber-Castell and other large organizations.`,
}

/* ─── Experiences (fixed order — Daycoval always first) ───────────────── */

const EXP_DAYCOVAL: Experience = {
  company: 'Banco Daycoval',
  role: { pt: 'Product Designer Specialist', en: 'Product Designer Specialist' },
  location: { pt: 'São Paulo, Brazil · Presencial', en: 'São Paulo, Brazil · On-site' },
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

const EXP_GOKK_COORD: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Coordenador de Product Design', en: 'Coordinator of Product Design' },
  location: { pt: 'São Paulo, Brazil · Híbrido', en: 'São Paulo, Brazil · Hybrid' },
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

const EXP_GOKK_COORD_DECATHLON: Experience = {
  ...EXP_GOKK_COORD,
  summary: {
    pt: 'Gerenciamento de time de 14 Designers e entrega de projetos estratégicos para múltiplos clientes. Projeto em destaque: Decathlon — Club / Ready to Play — redesenho estratégico da experiência de uma das principais soluções digitais da empresa.',
    en: 'Managed a team of 14 Designers and delivered strategic projects for multiple clients. Featured project: Decathlon — Club / Ready to Play — strategic redesign of one of the company\'s key digital solutions.',
  },
  achievements: [
    { pt: 'Liderança, mentoria e desenvolvimento de time de 14 Designers.', en: 'Lead, mentor and develop a team of 14 Designers.' },
    { pt: 'Mapeamento da jornada do cliente e benchmarking de mercado (Decathlon).', en: 'Mapped the existing customer journey and conducted market benchmarking (Decathlon).' },
    { pt: 'Desenvolvimento de soluções UX do discovery até handoff para Tecnologia.', en: 'Developed UX solutions from discovery through technology handoff.' },
  ],
}

const EXP_GOKK_LEADER: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Product Design Leader', en: 'Product Design Leader' },
  location: { pt: 'São Paulo, Brazil', en: 'São Paulo, Brazil' },
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

const EXP_GOKK_SENIOR: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Senior Product Designer', en: 'Senior Product Designer' },
  location: { pt: 'São Paulo, Brazil', en: 'São Paulo, Brazil' },
  start: '01/2015', end: '12/2016', current: false,
  summary: {
    pt: 'Responsável por projetos end-to-end de Product Design em múltiplas indústrias. Projetos: Pefisa / Pernambucanas (conta digital), Caixa Seguradoras (plano de saúde mobile), Stoneridge (rastreamento IoT de frotas, EUA), Cenoura & Bronze (engajamento mobile), Positron (segurança veicular com geofencing).',
    en: 'Responsible for end-to-end Product Design projects across multiple industries. Projects: Pefisa / Pernambucanas (digital account), Caixa Seguradoras (mobile health insurance), Stoneridge (IoT fleet tracking, USA), Cenoura & Bronze (mobile engagement), Positron (vehicle security with geofencing).',
  },
  achievements: [
    { pt: 'Discovery → Definição → Pesquisa → Ideação → Prototipagem → Testes de Usabilidade → Implementação.', en: 'Discovery → Definition → Research → Ideation → Prototyping → Usability Testing → Implementation.' },
    { pt: 'Pesquisa com usuários, personas, jornadas, mapas de empatia, surveys e entrevistas.', en: 'User research, personas, customer journeys, empathy maps, surveys and interviews.' },
    { pt: 'Prototipagem de baixa e alta fidelidade, testes A/B, suporte ao desenvolvimento e design handoff.', en: 'Low and high-fidelity prototyping, A/B testing, development support and design handoff.' },
  ],
}

const EXP_GOKK_PD: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Product Designer', en: 'Product Designer' },
  location: { pt: 'São Paulo, Brazil', en: 'São Paulo, Brazil' },
  start: '01/2014', end: '12/2014', current: false,
  summary: {
    pt: 'Projetos: Spark (solução mobile e web para capas personalizadas de smartphone), Risqué (simulador mobile de esmalte e catálogo de produtos para promotoras).',
    en: 'Projects: Spark (mobile and web solution for personalized smartphone covers), Risqué (mobile nail polish simulator and product catalog for promoters).',
  },
  achievements: [],
}

const EXP_PD_2013: Experience = {
  company: 'GOK.K | Digital Innovation',
  role: { pt: 'Product Designer', en: 'Product Designer' },
  location: { pt: 'São Paulo, Brazil', en: 'São Paulo, Brazil' },
  start: '01/2013', end: '12/2013', current: false,
  summary: {
    pt: 'Produtos digitais envolvendo IoT, iOS/Android, web responsivo e geolocalização. Projeto em destaque: Porto Seguro — Assistente Tempo — solução de logística para atendimento ao cliente usando geolocalização, melhorando a eficiência operacional.',
    en: 'Digital products involving IoT, iOS/Android, responsive web and geolocation. Featured project: Porto Seguro — Tempo Assistant — logistics solution for customer service using geolocation, improving operational efficiency.',
  },
  achievements: [],
}

const EXP_DIGITAL_DESIGNER: Experience = {
  company: 'Digital Designer',
  role: { pt: 'Digital Designer', en: 'Digital Designer' },
  location: { pt: 'São Paulo, Brazil', en: 'São Paulo, Brazil' },
  start: '02/2012', end: '01/2013', current: false,
  summary: {
    pt: 'Design de produtos digitais e websites, direção de arte, desenvolvimento de conceitos, design para redes sociais e comunicação digital.',
    en: 'Digital product and website design, art direction, concept development, social media design and digital communication.',
  },
  achievements: [],
}

const EXP_ADPLIST: Experience = {
  company: 'ADPList',
  role: { pt: 'Mentor de Design', en: 'Design Mentor' },
  location: { pt: 'Remoto', en: 'Remote' },
  start: '02/2022', end: '', current: true,
  summary: {
    pt: 'Mentoria para Product Designers e profissionais em transição para Design: Carreira · Product Design · Processos · Gestão · Liderança · Design Thinking.',
    en: 'Mentor Product Designers and professionals transitioning into Design: Career · Product Design · Processes · Management · Leadership · Design Thinking.',
  },
  achievements: [],
}

const EXP_AWARI: Experience = {
  company: 'AWARI',
  role: { pt: 'Especialista em UI Design', en: 'UI Designer Specialist' },
  location: { pt: 'Remoto', en: 'Remote' },
  start: '05/2022', end: '05/2023', current: false,
  summary: {
    pt: 'Instrutor com foco em UI Design, sistemas visuais, interfaces digitais e colaboração escalável em times Ágeis.',
    en: 'Instructor focused on UI Design, visual systems, digital interfaces and scalable collaboration within Agile teams.',
  },
  achievements: [],
}

/* ─── Shared sections ─────────────────────────────────────────────────── */

const EDUCATION: Education[] = [
  {
    school: 'PUCRS — Pontifícia Universidade Católica do Rio Grande do Sul',
    degree: { pt: 'Pós-graduação, User Experience Design e Além', en: 'Postgraduate Degree, User Experience Design and Beyond' },
    start: '2023', end: '2024',
  },
  {
    school: 'UNINOVE — Universidade Nove de Julho',
    degree: { pt: 'Bacharelado, Comunicação Social & Publicidade e Propaganda', en: "Bachelor's Degree, Social Communication & Advertising" },
    start: '2010', end: '2014',
  },
]

const SKILLS = [
  { category: { pt: 'Produto & Design', en: 'Product & Design' }, items: ['Product Design', 'UX Design', 'UI Design', 'UX Strategy', 'Product Discovery', 'User Research', 'Interaction Design', 'Design Thinking', 'Design Systems', 'Service Design', 'Experience Design', 'User-Centered Design', 'Prototyping', 'Usability Testing'] },
  { category: { pt: 'Liderança', en: 'Leadership' }, items: ['Design Leadership', 'Team Management', 'Career Development', 'Mentoring', 'Facilitation', 'Stakeholder Management', 'Cross-functional Collaboration', 'Conflict Resolution', 'Strategic Planning'] },
  { category: { pt: 'Dados & Produto', en: 'Data & Product' }, items: ['Data-driven Design', 'Product Analytics', 'Research Analysis', 'Conversion Optimization', 'Customer Journey', 'Funnel Optimization', 'Business Strategy'] },
  { category: { pt: 'Tecnologia & IA', en: 'Technology & AI' }, items: ['Figma', 'Figma MCP', 'Claude', 'Claude Code', 'Cursor', 'Antigravity', 'AI Agents', 'Generative AI', 'Rapid Prototyping', 'Adobe Creative Suite'] },
  { category: { pt: 'Metodologias', en: 'Methodologies' }, items: ['Design Thinking', 'Lean UX', 'Agile UX', 'Agile', 'Product Discovery', 'Design Sprint', 'Research-driven Design'] },
  { category: { pt: 'Indústrias', en: 'Industries' }, items: ['Fintech', 'Banking', 'Retail', 'HealthTech', 'EdTech', 'AI', 'E-commerce', 'IoT'] },
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

/* ─── Resume profiles ─────────────────────────────────────────────────── */

export function especialistaData(): ResumeData {
  return {
    header: { ...HEADER, headline: { pt: 'Product Designer Specialist · Fintech · Banking · AI-driven Product Design', en: 'Product Designer Specialist · Fintech · Banking · AI-driven Product Design' } },
    summary: SUMMARY,
    experience: [
      EXP_DAYCOVAL,
      EXP_GOKK_COORD_DECATHLON,
      EXP_GOKK_SENIOR,
      EXP_GOKK_PD,
      EXP_PD_2013,
      EXP_DIGITAL_DESIGNER,
      EXP_ADPLIST,
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
      pt: SUMMARY.pt + '\n\nImpactos-chave em liderança:\n• Gerenciamento e desenvolvimento de times de 5–15+ Designers.\n• Liderança de experiências omnichannel em 6+ unidades de negócio.\n• Mentoria de Designers em diferentes estágios de carreira.',
      en: SUMMARY.en + '\n\nKey leadership impact:\n• Managed and developed Design teams of 5–15+ professionals.\n• Led omnichannel experiences across 6+ business units.\n• Mentored Designers at different career stages.',
    },
    experience: [
      EXP_DAYCOVAL,
      EXP_GOKK_COORD,
      EXP_GOKK_LEADER,
      EXP_GOKK_SENIOR,
      EXP_GOKK_PD,
      EXP_ADPLIST,
      EXP_AWARI,
    ],
    education: EDUCATION,
    skills: SKILLS,
    languages: LANGUAGES,
    certifications: CERTIFICATIONS,
  }
}

/* ─── Cover letter defaults ───────────────────────────────────────────── */

export function defaultLetterData(): LetterData {
  return {
    kind: 'letter',
    salutation: { pt: 'Prezado(a) Recrutador(a),', en: 'Dear Hiring Manager,' },
    company: '',
    role: { pt: '', en: '' },
    body: {
      pt: `Sou Raul Lima, Product Designer com mais de 15 anos de experiência projetando e liderando produtos digitais em Fintech, Varejo, HealthTech, EdTech e Inteligência Artificial. Atualmente atuo como Product Designer Specialist no Banco Daycoval e como Coordenador de Product Design na GOK.K, onde lidero um time de 14 Designers.

Ao longo da minha trajetória, desenvolvi uma atuação sólida tanto em design de produto quanto em liderança de times, sempre conectando estratégia de negócio, pesquisa com usuários e entrega de valor real. Contribuí para produtos com mais de 1 milhão de usuários, aumentando taxas de conversão em até 25%, reduzindo abandono em 30%+ e melhorando a eficiência operacional em aproximadamente 20%.

Tenho especial interesse em oportunidades que combinem desafios complexos de UX com impacto estratégico — seja como especialista técnico ou como líder de time. Minha abordagem é orientada por dados e pelo usuário, com forte capacidade de articulação entre produto, tecnologia e negócio.

Fico à disposição para uma conversa. Meu portfólio está disponível em raullima.vercel.app.`,
      en: `My name is Raul Lima, a Product Designer with over 15 years of experience designing and leading digital products across Fintech, Retail, HealthTech, EdTech and Artificial Intelligence. I currently work as a Product Designer Specialist at Banco Daycoval and as Coordinator of Product Design at GOK.K, where I lead a team of 14 Designers.

Throughout my career, I have developed a strong track record in both product design and team leadership, always connecting business strategy, user research and real value delivery. I have contributed to products reaching over 1 million users, increasing conversion rates by up to 25%, reducing drop-off by 30%+ and improving operational efficiency by approximately 20%.

I am particularly interested in opportunities that combine complex UX challenges with strategic impact — whether as a technical specialist or as a team leader. My approach is data and user-driven, with a strong ability to bridge product, technology and business.

I would be happy to connect for a conversation. My portfolio is available at raullima.vercel.app.`,
    },
    closing: { pt: 'Atenciosamente,\nRaul Lima', en: 'Sincerely,\nRaul Lima' },
  }
}
