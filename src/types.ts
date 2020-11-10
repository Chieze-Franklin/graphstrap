export interface Config {
    config: {
        in: string;
        schema: {
            outDir: string;
        }
        resolvers: {
            rootDir: string;
            context: {
                default?: string;
                from: string;
                import?: string;
            }
            queries: {
                templates: {
                    model: string;
                    models: string;
                }
            }
        }
    }
}

export interface Store {
    concreteInterfaceNames?: string[];
    in?: string;
    inFiles?: string[];
    schemaOutDir?: string;
    resolversRootDir?: string;
    context?: {
        default?: string;
        from: string;
        import?: string;
    }
    templates?: {
        model?: string;
        models?: string;
    }
}
