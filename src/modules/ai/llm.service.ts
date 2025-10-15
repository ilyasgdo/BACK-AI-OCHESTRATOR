import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './providers/openai.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { PerplexityProvider } from './providers/perplexity.provider';
import { GoogleProvider } from './providers/google.provider';
import { ensureJsonResponse as ensureJsonFromText } from '../../common/json';

@Injectable()
export class LlmService {
  // In v1, we stub deterministic JSON strings without external API calls.
  constructor(private readonly config: ConfigService) {}

  private get timeoutMs(): number {
    return Number(this.config.get('LLM_TIMEOUT_MS') ?? 8000);
  }

  private get maxRetries(): number {
    return Number(this.config.get('LLM_MAX_RETRIES') ?? 2);
  }

  private get useMock(): boolean {
    const mode = (this.config.get('LLM_MODE') ?? 'mock').toString().toLowerCase();
    const provider = (this.config.get('LLM_PROVIDER') ?? '').toString().toLowerCase();
    if (mode === 'mock') return true;
    if (!provider) return true;
    if (provider === 'openai') return !this.config.get('OPENAI_API_KEY');
    if (provider === 'perplexity') return !this.config.get('PERPLEXITY_API_KEY');
    if (provider === 'google') return !this.config.get('GOOGLE_API_KEY');
    // Ollama par défaut sur localhost, pas d’API key
    if (provider === 'ollama') return false;
    return true;
  }

  private get openai(): OpenAiProvider | null {
    const provider = (this.config.get('LLM_PROVIDER') ?? '').toString().toLowerCase();
    if (provider !== 'openai') return null;
    const apiKey = this.config.get('OPENAI_API_KEY');
    const model = (this.config.get('LLM_MODEL') ?? 'gpt-4o-mini').toString();
    if (!apiKey) return null;
    return new OpenAiProvider(apiKey, model);
  }

  private get perplexity(): PerplexityProvider | null {
    const provider = (this.config.get('LLM_PROVIDER') ?? '').toString().toLowerCase();
    if (provider !== 'perplexity') return null;
    const apiKey = this.config.get('PERPLEXITY_API_KEY');
    const model = (this.config.get('LLM_MODEL') ?? 'pplx-70b-online').toString();
    if (!apiKey) return null;
    return new PerplexityProvider(apiKey, model);
  }

  private get ollama(): OllamaProvider | null {
    const provider = (this.config.get('LLM_PROVIDER') ?? '').toString().toLowerCase();
    if (provider !== 'ollama') return null;
    const baseUrl = (this.config.get('OLLAMA_BASE_URL') ?? 'http://localhost:11434').toString();
    const model = (this.config.get('LLM_MODEL') ?? 'llama3.1').toString();
    return new OllamaProvider(baseUrl, model);
  }

  private get google(): GoogleProvider | null {
    const provider = (this.config.get('LLM_PROVIDER') ?? '').toString().toLowerCase();
    if (provider !== 'google') return null;
    const apiKey = this.config.get('GOOGLE_API_KEY');
    const model = (this.config.get('LLM_MODEL') ?? 'gemini-1.5-flash').toString();
    if (!apiKey) return null;
    return new GoogleProvider(apiKey, model);
  }

  private get currentProvider(): { completeJson: (system: string, user: string) => Promise<string> } | null {
    return this.openai ?? this.google ?? this.perplexity ?? this.ollama ?? null;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('LLM timeout')), ms);
      promise
        .then((val) => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastErr: any;
    while (attempt <= this.maxRetries) {
      try {
        return await this.withTimeout(fn(), this.timeoutMs);
      } catch (err) {
        lastErr = err;
        attempt++;
        if (attempt > this.maxRetries) break;
        // Simple backoff
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
    throw lastErr ?? new Error('LLM failed after retries');
  }

  async toolsPractices(user: any): Promise<string> {
    if (!this.useMock && this.currentProvider) {
      const system = 'You are an assistant that must respond strictly with a JSON object, no prose.';
      const profile = { job: user.job, sector: user.sector, ai_level: user.ai_level, tools_used: user.toolsUsed, work_style: user.workStyle };
      const userMsg = `Generate AI tools and best practices for a user profile. Return JSON: { ai_tools: [{ name, category, use_case }], best_practices: string[] }. Profile: ${JSON.stringify(profile)}`;
      return this.withRetry(async () => {
        const raw = await this.currentProvider!.completeJson(system, userMsg);
        const json = ensureJsonFromText(raw);
        return JSON.stringify(json);
      });
    }

    const baseTools = [
      { name: 'ChatGPT', category: 'Assistant', use_case: 'Rédaction, idéation' },
      { name: 'Perplexity', category: 'Recherche', use_case: 'Recherche d’informations et synthèses' },
      { name: 'Midjourney', category: 'Création visuelle', use_case: 'Génération d’images' },
    ];
    const practices = [
      'Vérifier les sources et la véracité',
      'Ne pas inclure de données sensibles',
      'Documenter les prompts efficaces',
      'Mesurer l’impact avant déploiement',
      'Former les équipes aux usages responsables',
    ];
    const payload = {
      ai_tools: baseTools,
      best_practices: practices,
    };
    return this.withRetry(async () => JSON.stringify(payload));
  }

  async generateCourse(user: any, ai_tools: any[]): Promise<string> {
    if (!this.useMock && this.currentProvider) {
      const system = 'You must respond strictly with a JSON object. No extra text.';
      const userMsg = `Generate a course overview title and modules based on tools. Return JSON { title, modules: [{ title, description, objectives: string[] }] }. Profile: ${JSON.stringify({ job: user.job, sector: user.sector })}. Tools: ${JSON.stringify(ai_tools)}`;
      return this.withRetry(async () => {
        const raw = await this.currentProvider!.completeJson(system, userMsg);
        const json = ensureJsonFromText(raw);
        return JSON.stringify(json);
      });
    }

    const title = `Parcours IA pour ${user.job}`;
    const modules = [
      {
        title: 'Fondamentaux de l’IA',
        description: 'Comprendre les bases et les cas d’usage',
        objectives: ['Concepts clés', 'Cas concrets', 'Bonnes pratiques'],
      },
      {
        title: 'Outils IA pour le quotidien',
        description: 'Automatiser et améliorer la productivité',
        objectives: ['Assistants', 'Automatisation', 'Qualité'],
      },
      {
        title: 'Prompting avancé',
        description: 'Techniques pour des résultats fiables',
        objectives: ['Structurer les prompts', 'Évaluer les réponses', 'Itérer'],
      },
    ];
    const payload = { title, modules };
    return this.withRetry(async () => JSON.stringify(payload));
  }

  async generateModule(module: { title: string; description: string; objectives: string[] }): Promise<string> {
    if (!this.useMock && this.currentProvider) {
      const system = 'Respond strictly with JSON only.';
      const userMsg = `Expand a module into lessons and a quiz. Return JSON { title, lessons: [{title,content}], quiz: [{question,options,answer}], chatbot_context }. Module: ${JSON.stringify(module)}`;
      return this.withRetry(async () => {
        const raw = await this.currentProvider!.completeJson(system, userMsg);
        const json = ensureJsonFromText(raw);
        return JSON.stringify(json);
      });
    }

    const lessons = [
      { title: 'Introduction', content: `Présentation du module: ${module.title}` },
      { title: 'Étude de cas', content: 'Exemples pratiques et démonstrations' },
      { title: 'Mise en pratique', content: 'Exercices guidés pour acquérir des compétences' },
    ];
    const quiz = [
      { question: 'Quel est un bon usage des LLMs ?', options: ['Automatiser tout', 'Améliorer la productivité', 'Remplacer l’humain', 'Ignorer la véracité'], answer: 'Améliorer la productivité' },
      { question: 'Que faut-il éviter ?', options: ['Données sensibles', 'Documenter les prompts', 'Mesurer l’impact', 'Former les équipes'], answer: 'Données sensibles' },
      { question: 'Quel outil pour la recherche ?', options: ['Perplexity', 'Midjourney', 'Photoshop', 'Figma'], answer: 'Perplexity' },
    ];
    const chatbot_context = `Tu es un tuteur IA spécialisé dans le module "${module.title}". Réponds de manière concise et utile.`;
    const payload = { title: module.title, lessons, quiz, chatbot_context };
    return this.withRetry(async () => JSON.stringify(payload));
  }

  async generateLessons(module: { title: string; description: string; objectives: string[] }): Promise<string> {
    if (!this.useMock && this.currentProvider) {
      const system = 'Respond strictly with JSON only.';
      const userMsg = `Generate pedagogical lessons for a module. Return JSON { lessons: [{title,content}] }. Module: ${JSON.stringify(
        module,
      )}`;
      return this.withRetry(async () => {
        const raw = await this.currentProvider!.completeJson(system, userMsg);
        const json = ensureJsonFromText(raw);
        return JSON.stringify(json);
      });
    }

    const lessons = [
      { title: `Nouvelles notions — ${module.title}`, content: 'Concepts clés approfondis et applications concrètes.' },
      { title: 'Atelier guidé', content: 'Étapes pratiques pour renforcer la compréhension.' },
    ];
    return this.withRetry(async () => JSON.stringify({ lessons }));
  }

  async developLesson(input: {
    title: string;
    module_title: string;
    description?: string;
    objectives?: string[];
    course_title?: string;
    course_summary?: string | unknown;
  }): Promise<string> {
    if (!this.useMock && this.currentProvider) {
      const system = 'Respond strictly with JSON only.';
      const userMsg = `Develop a lesson as structured JSON. Return JSON { content_json: { title: string, sections: Array< { type: \"text\", heading?: string, text: string } | { type: \"list\", heading?: string, items: string[] } | { type: \"code\", heading?: string, language: string, code: string } | { type: \"callout\", variant: \"tip\" | \"warning\" | \"note\", text: string } >, references?: string[], quiz?: Array<{ question: string, options: string[], answer: string }> } }.\nLesson title: ${input.title}. Module: ${input.module_title}. Course: ${input.course_title ?? ''}. Description: ${input.description ?? ''}. Objectives: ${(input.objectives ?? []).join(', ')}`;
      return this.withRetry(async () => {
        const raw = await this.currentProvider!.completeJson(system, userMsg);
        const json = ensureJsonFromText(raw);
        return JSON.stringify(json);
      });
    }

    // Mock: structured JSON for "Introduction to Advanced Predictive Modeling"
    const content_json = {
      title: input.title,
      sections: [
        ...(input.course_title
          ? [{ type: 'callout', variant: 'note', heading: 'Contexte du cours', text: `Cours lié: ${input.course_title}` }]
          : []),
        { type: 'text', heading: 'Overview', text: 'Build a strong foundation for advanced predictive modeling with Ollama.' },
        { type: 'list', heading: 'What is Predictive Modeling?', items: [
          'Uses historical data to forecast outcomes',
          'Tasks: classification, regression, time series forecasting'] },
        { type: 'list', heading: 'Ollama Overview', items: [
          'Local LLM runtime: privacy, low latency, offline',
          'Architecture: model runner, prompt orchestration, adapters'] },
        { type: 'text', heading: 'Integration with ML Frameworks', text: 'Use Ollama to assist feature design, documentation, and experiment planning with scikit-learn, PyTorch or TensorFlow.' },
        { type: 'list', heading: 'Project Structure Example', items: [
          'data/: raw and processed datasets',
          'notebooks/: EDA and experiments',
          'src/: training scripts and pipelines',
          'reports/: metrics and model cards'] },
        { type: 'list', heading: 'Practical Steps', items: [
          'Define target metric (RMSE/MAE/AUC)',
          'Build baseline model',
          'Use Ollama to suggest feature transforms and hyperparameters',
          'Iterate with validation and cross-validation'] },
        { type: 'callout', variant: 'warning', text: 'Beware of data leakage and overfitting. Use robust CV.' },
        { type: 'code', heading: 'scikit-learn Baseline', language: 'python', code: 'from sklearn.linear_model import LinearRegression\nmodel = LinearRegression().fit(X_train, y_train)\nprint(model.score(X_val, y_val))' },
        { type: 'text', heading: 'Next', text: 'Proceed to model development techniques and time series analysis.' },
      ],
      references: [
        'https://scikit-learn.org/',
        'https://ollama.com/'
      ],
      quiz: [
        {
          question: 'Quel est l’objectif principal du modèle prédictif ?',
          options: ['Prédire des valeurs', 'Modifier les données', 'Ignorer la validation', 'Augmenter la taille du dataset'],
          answer: 'Prédire des valeurs',
        },
        {
          question: 'Quel risque doit-on surveiller ?',
          options: ['Sur-apprentissage', 'Documentation', 'Mesure', 'Itération'],
          answer: 'Sur-apprentissage',
        },
      ],
    };

    return this.withRetry(async () => JSON.stringify({ content_json }));
  }

  async generateSummary(course: { title: string; modules: any[] }): Promise<string> {
    if (!this.useMock && this.currentProvider) {
      const system = 'Return a strict JSON object only.';
      const userMsg = `Summarize a course and list skills gained and a short certificate text. Return JSON { summary, skills_gained: string[], certificate_text }. Course: ${JSON.stringify(course)}`;
      return this.withRetry(async () => {
        const raw = await this.currentProvider!.completeJson(system, userMsg);
        const json = ensureJsonFromText(raw);
        return JSON.stringify(json);
      });
    }

    const summary = `Ce parcours "${course.title}" couvre ${course.modules?.length ?? 0} modules avec outils et pratiques IA.`;
    const skills_gained = ['Prompting', 'Veille IA', 'Automatisation', 'Esprit critique'];
    const certificate_text = 'Félicitations pour la complétion du parcours IA. Vous avez acquis des bases solides et des pratiques responsables.';
    return this.withRetry(async () => JSON.stringify({ summary, skills_gained, certificate_text }));
  }

  async chatWithContext(context: string, message: string): Promise<string> {
    // Retour JSON { reply: string }
    if (!this.useMock && this.currentProvider) {
      const system = context || 'You are a helpful tutor. Answer concisely.';
      const userMsg = `Respond to the user's message. Return JSON { reply: string }. User message: ${message}`;
      return this.withRetry(async () => {
        const raw = await this.currentProvider!.completeJson(system, userMsg);
        const json = ensureJsonFromText(raw);
        return JSON.stringify(json);
      });
    }

    const reply = `(${new Date().toLocaleTimeString()}) ${message}`;
    return this.withRetry(async () => JSON.stringify({ reply }));
  }
}