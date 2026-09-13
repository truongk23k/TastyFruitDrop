declare const Editor: any;

const { dialog } = require('electron');

export const methods: { [key: string]: (...args: any[]) => any } = {
    openSpriteSlicer() {
        Editor.Panel.open('dev-tools.sprite-slicer');
    },

    pickImage() {
        const result = dialog.showOpenDialogSync({
            title: 'Chọn ảnh atlas',
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
        });
        return result && result[0] ? result[0] : null;
    },

    pickOutputFolder() {
        let defaultPath: string | undefined;
        try { defaultPath = Editor.Project.path; } catch (e) { defaultPath = undefined; }
        const result = dialog.showOpenDialogSync({
            title: 'Chọn thư mục lưu sprite',
            defaultPath,
            properties: ['openDirectory', 'createDirectory'],
        });
        return result && result[0] ? result[0] : null;
    },
};

export function load() { }
export function unload() { }
