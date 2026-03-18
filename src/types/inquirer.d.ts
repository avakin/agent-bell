declare module "inquirer" {
  interface Question {
    type: string;
    name: string;
    message: string;
    choices?: Array<{ name: string; value: unknown; checked?: boolean }>;
    default?: unknown;
    validate?: (input: unknown) => boolean | string;
  }

  interface Inquirer {
    prompt(questions: Question[]): Promise<Record<string, unknown>>;
  }

  const inquirer: Inquirer;
  export default inquirer;
}
