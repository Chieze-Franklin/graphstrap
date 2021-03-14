import fs from 'fs-extra';
import path from 'path';
import { showError, showGenerated, showInfo } from '../utils/logger.util';
import { store } from '../store';
import Emitter from '../generators/real-resolvers/emitter';
import SilverB from 'silverb';

export async function queriesActions(): Promise<any>  {
    if (store.resolversRootDir && store.concreteInterfaceNames) {
        showInfo('Generating query resolvers...');

        const interfaces = store.concreteInterfaceNames;
        const rootQueryPath = path.resolve(path.join(store.resolversRootDir, `queries/index.ts`));
        const rootQueryCodeGenPath = path.resolve(path.join(store.resolversRootDir, `queries/queries.ts`));
        const emitter = new Emitter();

        if (!fs.existsSync(rootQueryPath)) {
            await fs.createFile(rootQueryPath)
            const rootQueryWriteStream = fs.createWriteStream(rootQueryPath);
            emitter.emitRootQuery(rootQueryWriteStream, interfaces);
            showGenerated(rootQueryPath);
        }

        await fs.createFile(rootQueryCodeGenPath);
        const rootQueryCodeGenWriteStream = fs.createWriteStream(rootQueryCodeGenPath);
        emitter.emitRootQueryCodeGen(rootQueryCodeGenWriteStream, interfaces);
        showGenerated(rootQueryCodeGenPath);

        interfaces.forEach(async _interface => {
            const resolverPath =
                path.resolve(path.join(store.resolversRootDir!, `queries/${_interface.toLowerCase()}/${_interface}QueryResolvers.ts`));
            const resolverCodeGenPath =
                path.resolve(path.join(store.resolversRootDir!, `queries/${_interface.toLowerCase()}/${_interface}QueryResolversCodeGen.ts`));

            // create the normal resolver file only if it does not exist
            if (!fs.existsSync(resolverPath)) {
                await fs.createFile(resolverPath);
                const writeStream = fs.createWriteStream(resolverPath);
                emitter.emitQuery(writeStream, _interface);
                showGenerated(resolverPath);
            }

            let codegen: any = {};
            const variables = {
                model: _interface
            };
            Object.entries((store.templates || {})).forEach(([key, value]) => {
                if (!['model', 'models'].includes(key)) {
                    return;
                }
                if (!value) {
                    return;
                }
                const templatePath = path.resolve(value);
                if (fs.existsSync(templatePath)) {
                    const template = fs.readFileSync(templatePath, {encoding:'utf8', flag:'r'});
                    codegen[key] = new SilverB(template).compile(variables);
                } else {
                    showError(`The template file ${value} cannot be found in this directory`);
                }
            });
            await fs.createFile(resolverCodeGenPath);
            const codeGenWriteStream = fs.createWriteStream(resolverCodeGenPath);
            emitter.emitQueryCodeGen(codeGenWriteStream, _interface, codegen);
            showGenerated(resolverCodeGenPath);
        });

        return;
    }
}
