import GObject from "gi://GObject";
import St from "gi://St";
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
const { GLib, Gio, Clutter } = imports.gi;

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(extensionObject) {
            super._init(0.0, _("ToDo"));

            this.add_child(
                new St.Icon({
                    icon_name: "emblem-documents-symbolic",
                    style_class: "system-status-icon suru-system-status-icon",
                }),
            );
            this.menu.actor.add_style_class_name("mySuru_Menu");

            this._settings = extensionObject.getSettings();
            this._tasks = this._settings
                .get_value("todo-items")
                .deep_unpack()
                .map((i, index) => ({ id: index, text: i[0], state: i[1] }));

            const title = new PopupMenu.PopupSeparatorMenuItem("suruこと, Todo", {
                can_focus: false,
                hover: false,
                reactive: false,
                style_class: "my-menu-item-title",
            });

            title.setOrnament(PopupMenu.Ornament.NONE);
            this.menu.addMenuItem(title);

            const inputHolder = new PopupMenu.PopupMenuItem("", {
                can_focus: false,
                hover: false,
                reactive: false,
                style_class: "my-menu-item-input",
            });

            const input = new St.Entry({
                name: "newTaskEntry",
                hint_text: _("New Task"),
                track_hover: true,
                can_focus: true,
                style_class: "my-input",
            });
            this._input = input;
            input.clutter_text.connect("activate", () => {
                let task = input.get_text();

                if (task === "") return;

                const l = this._tasks.slice(-1);
                const newTask = { id: (l.length != 0 ? l[0].id : 0) + 1, text: task, state: false };
                this._tasks.push(newTask);
                // this._settings.set_strv(
                //     "todo-items",
                //     this._tasks.map((i) => [i.text, i.state]),
                // );
                this._settings.set_value(
                    "todo-items",
                    new GLib.Variant(
                        "a(sb)",
                        this._tasks.map((i) => [i.text, i.state]),
                    ),
                );

                this._loadATask(newTask);
                input.set_text("");
            });

            inputHolder.add_child(input);

            this.menu.addMenuItem(inputHolder);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(" ", { style_class: "my-menu-item-title" }));

            const listMenuItem = new PopupMenu.PopupMenuItem("", {
                can_focus: false,
                hover: false,
                reactive: false,
                style_class: "my-suru-list-menu",
            });

            let scrollSuru = new St.ScrollView({
                overlay_scrollbars: true,
                style_class: "suru-scroll-container",
            });

            let Container = new St.BoxLayout({
                vertical: true,
                style_class: "suru-layout-container",
            });
            scrollSuru.add_child(Container);

            this._Container = Container;
            this._tasks.forEach((task) => {
                this._loadATask(task);
            });
            listMenuItem.add_child(scrollSuru);
            this.menu.addMenuItem(listMenuItem);
        }

        _loadATask(task) {
            const hbox = new St.BoxLayout({ vertical: false, style_class: "suru-task" });

            let cicn = new St.Icon({
                icon_name: "object-select-symbolic",
                style_class: `suru-check-icon${task.state && "-checked"}`,
            });
            let checkBox = new St.Button({
                track_hover: true,
                reactive: true,
                can_focus: true,
                style_class: "my-suru-button-check",
            });
            let lbl = new Clutter.Text({
                font_name: "Sans 10",
                text: this._textState(task.state, task.text),
                line_wrap: true,
                width: 300,
                color: Clutter.Color.from_string(this._colorState(task.state))[1],
                use_markup: true,
            });
            checkBox.connect("clicked", () => {
                let target = this._tasks.findIndex((i) => i.id == task.id);
                if (target == -1) return;
                let oldState = this._tasks[target].state;
                this._tasks = this._tasks.map((i) => (i.id == task.id ? { id: i.id, text: i.text, state: !oldState } : i));
                this._settings.set_value(
                    "todo-items",
                    new GLib.Variant(
                        "a(sb)",
                        this._tasks.map((i) => [i.text, i.state]),
                    ),
                );
                lbl.set_text(this._textState(!oldState, task.text));
                lbl.set_color(Clutter.Color.from_string(this._colorState(!oldState))[1]);
                lbl.use_markup = true;
                oldState ? cicn.remove_style_class_name("suru-check-icon-checked") : cicn.add_style_class_name("suru-check-icon-checked");
            });
            checkBox.add_child(cicn);

            const dicn = new St.Icon({
                icon_name: "user-trash-symbolic",
                style_class: "suru-trash-icon",
            });
            const remove_button = new St.Button({
                style_class: "my-suru-button-del",
                track_hover: true,
                reactive: true,
                can_focus: true,
            });

            remove_button.connect("clicked", () => {
                this._tasks = this._tasks.filter((i) => i.id != task.id);

                this._settings.set_value(
                    "todo-items",
                    new GLib.Variant(
                        "a(sb)",
                        this._tasks.map((i) => [i.text, i.state]),
                    ),
                );
                hbox.destroy();
            });
            remove_button.add_child(dicn);

            const eicn = new St.Icon({
                icon_name: "document-edit-symbolic",
                style_class: "suru-trash-icon",
            });
            const edit_button = new St.Button({
                style_class: "my-suru-button-edit",
                track_hover: true,
                reactive: true,
                can_focus: true,
            });
            edit_button.connect("clicked", () => {
                this._input.set_text(task.text);
                this._input.grab_key_focus();
                this._tasks = this._tasks.filter((i) => i.id != task.id);

                this._settings.set_value(
                    "todo-items",
                    new GLib.Variant(
                        "a(sb)",
                        this._tasks.map((i) => [i.text, i.state]),
                    ),
                );
                hbox.destroy();
            });
            edit_button.add_child(eicn);

            hbox.add_child(checkBox);
            hbox.add_child(lbl);
            hbox.add_child(edit_button);
            hbox.add_child(remove_button);
            this._Container.add_child(hbox);
        }

        _colorState(state) {
            return state ? "#616161" : "#FFFFFF";
        }
        _textState(state, text) {
            return state ? `<s>${text}</s>` : text;
        }
    },
);

export default class IndicatorExampleExtension extends Extension {
    enable() {
        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
