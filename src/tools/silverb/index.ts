'use strict';

const
    check = require('syntax-error');

type SettingsBlock = {
    index: number;
    match: string;
    type: string;
};

type Settings = {
    blocksMatch: string;
    blocks: {
        logic: SettingsBlock;
        variable: SettingsBlock;
        logicLineUp: SettingsBlock;
    };
};

type TextBlock = {
    content: string;
    isJavascript: boolean;
    type: string;
}

export default class Template {

    private template: any;
    private name: string;
    private settings: Settings = {
        blocksMatch: '',
        blocks: {
            logic: {
                index: 1,
                match: '',
                type: '',
            },
            variable: {
                index: 1,
                match: '',
                type: '',
            },
            logicLineUp: {
                index: 1,
                match: '',
                type: '',
            }
        },
    };
    private textBlocks: TextBlock[] = [];
    private generatedCode = '';
    private actualLineIsLogic = false;
    private previousLineIsLogic = false;

    constructor(template: any, name = 'UNKNOWN') {
        this.template = template;
        this.name = name;
        this.initSettings();
        this.resetTemplate();
    }

    initSettings() {
        this.settings = {
            blocksMatch: '',
            blocks: {
                logic: {
                    index: 1,
                    match: '<%(.+?)%>',
                    type: 'LOGIC'
                },
                variable: {
                    index: 2,
                    match: '<\\$(.+?)\\$>',
                    type: 'VARIABLE'
                },
                logicLineUp: {
                    index: 3,
                    match: '<up(.+?)up>',
                    type: 'LOGIC'
                },
            }
        };

        this.setAllBlocksMatching();
    }

    /**
     * Set all the blocks regular expressions to future search on the template
     */
    setAllBlocksMatching() {
        let matches = [];

        for (const [index,block] of Object.entries(this.settings.blocks)) {
            matches.push(block.match);
        }

        this.settings.blocksMatch = matches.join('|');
    }

    resetTemplate() {
        this.textBlocks = [];
        this.generatedCode = 'var codeBlocks = [];\n';
        this.actualLineIsLogic = false;
        this.previousLineIsLogic = false;
        this.addHelperFunctions();
    }

    compile(data: any) {
        this.generateCode();
        
        return new Function(this.generatedCode).apply(data);
    }

    generateCode() {
        this.resetTemplate();
        this.treatTemplateCode();
        this.separateTextFromCodeBlocks();

        this.textBlocks.forEach(block => {
            this.addLine(block);
        });
        
        this.finishGeneratedCode();
    }

    getGeneratedCode() {
        this.generateCode();

        return this.generatedCode;
    }

    addHelperFunctions() {
        
        // Can be used inside a template to conditionally remove the last breakline
        let removeLastBreakLine = function() {
            const codeBlocks: string[] = [];
            let lastCodeBlockIndex = codeBlocks.length - 1;
            codeBlocks[lastCodeBlockIndex - 1] = codeBlocks[lastCodeBlockIndex - 1].replace(/(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*$/, '')
        }
        
        this.generatedCode += 'this.removeLastBreakLine = ' + removeLastBreakLine.toString() + ';\n';

    }

    treatTemplateCode() {
        // Remove comments
        this.template = this.template.replace(/(\r\n|\n|\r|\u2028|\u2029)?(\t| )*(<#)(.*)(#>)/g, '');

        // Remove breaklines from logic blocks
        this.template = this.template.replace(/(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*(<%)/g, '<%');
        this.template = this.template.replace(/(\r\n|\n|\r||\u2028|\u2029){1}(\t| )*(<up)/g, '<up');

        // Remove spaces and breaklines after lineup logic block
        this.template = this.template.replace(/(up>)(\r\n|\n|\r|\u2028|\u2029){1}(\t| )*/g, 'up>');
    }

    separateTextFromCodeBlocks() {
        let matchBlocks = new RegExp(this.settings.blocksMatch, "g"),
            cursor = 0,
            match;

        while(match = matchBlocks.exec(this.template)) {

            this.addTextBlock(this.template.slice(cursor, match.index));
            this.addAllJavaScriptBlocks(match);

            cursor = match.index + match[0].length;
            
        }

        this.addTextBlock(this.template.substr(cursor, this.template.length - cursor));
    }

    addAllJavaScriptBlocks(templateMatch: RegExpExecArray) {
        for (const [index,block] of Object.entries(this.settings.blocks)) {
            if(templateMatch[block.index]) {
                this.addTextBlock(templateMatch[block.index], true, block.type);
            }
        }
    }

    addTextBlock(content: string, isJavascript = false, type = 'TEXT') {
        let matchJavascriptCodeLineUp = /(^( (lineup)( )*)(var|let|console|if|for|else|switch|case|break|{|}))(.*)?/g;

        if(type == 'TEXT') {
            content = this.convertTextSpecialCharacters(content);
        }

        let textBlock = {
            content: content,
            isJavascript: isJavascript,
            type: type
        };

        this.textBlocks.push(textBlock);
    }

    addLine(block: TextBlock) {
        if(block.isJavascript) {
            this.generatedCode += (block.type === 'LOGIC') ? block.content + '\n' : 'codeBlocks.push(' + block.content + ');\n';
        } else {
            this.generatedCode += 'codeBlocks.push("' + this.convertLineCharacters(block.content) + '");\n';
        }
    }

    convertTextSpecialCharacters(content: string) {
        content = content.replace(/\\/g, '\\\\');
        return content;
    }

    convertLineCharacters(line: string) {
        line = line.replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\t/g, '\\t')
                .replace(/\r/g, '\\r');

        return line;
    }

    finishGeneratedCode() {
        this.generatedCode += 'return codeBlocks.join("");';
        this.generatedCode.replace(/[\r\t\n]/g, '');
        this.checkGeneratedCode();
    }

    checkGeneratedCode() {
        let error = check(this.generatedCode);
        if(error) {
            console.error('TEMPLATE SYNTAX - ERROR DETECTED');
            console.error(error);
            console.error(Array(76).join('-')); //-----...
        }
    }

}
