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
            mutations: {
                templates: {
                    createModel: string;
                    deleteModel: string;
                    deleteManyModels: string;
                    updateModel: string;
                    updateManyModels: string;
                    upsertModel: string;
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
        createModel?: string;
        deleteModel?: string;
        deleteManyModels?: string;
        updateModel?: string;
        updateManyModels?: string;
        upsertModel?: string;
    }
}
