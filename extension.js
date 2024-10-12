import GObject from "gi://GObject";
import St from "gi://St";
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import Pango from "gi://Pango";

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
                .map((i, index) => ({ id: this._TempId(), text: i[0], state: i[1] }));
            this._archive = this._settings.get_value("archive-items").deep_unpack()
            .map((i, index) => ({ id: this._TempId(), text: i[0], state: i[1] }));

            const title = new PopupMenu.PopupMenuItem("",{
                can_focus: false,
                hover: false,
                reactive: false,
                style_class: "my-menu-item-title",
            });
            
            const titleLabel = new St.Label({
                text: "suruこと, Todo",
                style_class: "my-title",
                x_expand: true
            })

            const donationIcon = new St.Icon({
                icon_name: "emblem-favorite-symbolic",
                style_class: "suru-donation-icon",
            });
            const donationButton = new St.Button({
                style_class: "my-suru-button-donation",
                track_hover: true,
                reactive: true,
                can_focus: true,
            });
            donationButton.add_child(donationIcon);
            donationButton.connect("clicked", ()=>{
                
                Gio.AppInfo.launch_default_for_uri("https://buymeacoffee.com/ryusufe", null);   
                
            })
            
            title.add_child(titleLabel);
            title.add_child(donationButton);
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

                if(this._mode){
                    const newTask = { id: this._TempId(), text: task, state: false };
                    this._tasks.push(newTask);
                    
                    this._updateTodo();
                    this._loadATask(newTask);
                    this._listCount.text = `${this._tasks.length}`;

                }
                else{
                    const newArchive = { id: this._TempId(), text: task, state:false };
                    this._archive.push(newArchive);
                    
                    
                    this._updateArchive();
                    this._loadArchives(newArchive);
                    this._listCount.text = `${this._archive.length}`;
                }
                
                input.set_text("");
            });

            inputHolder.add_child(input);

            this.menu.addMenuItem(inputHolder);


            //

            let scrollSuru = new St.ScrollView({
                overlay_scrollbars: true,
                style_class: "suru-scroll-container",
            });

            const modeItem = new PopupMenu.PopupMenuItem('', {can_focus: false,
                hover: false,
                reactive: false,
                style_class:'my-suru-mode'}
            );

            const modeGroup = new St.BoxLayout({ vertical: false, style_class: "suru-mode-group"});
            

            this._mode = true;
            let spacer = new St.Widget({x_expand:true});
            let todoBox = new St.BoxLayout({ vertical: false, x_expand:true});
            const todoGroup = new St.BoxLayout({ vertical: false, style_class: `suru-mode-bl${this._mode ? '_selected' : ''}`, reactive: true });
            let archiveBox = new St.BoxLayout({ vertical: false, x_expand:true});
            const archiveGroup = new St.BoxLayout({ vertical: false, style_class: `suru-mode-bl${!this._mode ? '_selected' : ''}` , reactive: true});
       
            // todo group

            let todoIcon = new St.Icon({
                icon_name: "view-list-bullet-symbolic",
                style_class: `suru-mode-icon`
            });
            let todoLabel = new St.Label({
                text: 'Todo'
            })
            todoGroup.connect("button-press-event", ()=>{
                if(!this._mode){
                    this._mode = true;
                    todoGroup.style_class = `suru-mode-bl${this._mode ? '_selected' : ''}`;
                    archiveGroup.style_class = `suru-mode-bl${!this._mode ? '_selected' : ''}`;    
                    scrollSuru.remove_child(this._archiveContainer);                    
                    scrollSuru.add_child(this._todoContainer);
                    this._listCount.text = `${this._tasks.length}`;
                }
            });

            todoGroup.add_child(todoIcon);
            todoGroup.add_child(todoLabel);

            // archive group

            let archiveIcon = new St.Icon({
                icon_name: "folder-visiting-symbolic",
                style_class: `suru-mode-icon`
            });
            let archiveLabel = new St.Label({
                text: 'Archive'
            })
            archiveGroup.connect("button-press-event", ()=>{
                if(this._mode){
                    this._mode = false;
                    todoGroup.style_class = `suru-mode-bl${this._mode ? '_selected' : ''}`;
                    archiveGroup.style_class = `suru-mode-bl${!this._mode ? '_selected' : ''}`;    
                    scrollSuru.remove_child(this._todoContainer);                    
                    scrollSuru.add_child(this._archiveContainer);
                    this._listCount.text = `${this._archive.length}`;
                }
            });
            archiveGroup.add_child(archiveIcon);
            archiveGroup.add_child(archiveLabel);
            

            todoBox.add_child(spacer);
            todoBox.add_child(todoGroup);

            modeGroup.add_child(todoBox);
            modeGroup.add_child(new St.Label({text:'|', style_class: "suru-mode-seperator"}));
            this._listCount = new St.Label({
                text: `${this._tasks.length}`,
                style_class: 'suru-count-label'
            })
            modeGroup.add_child(this._listCount);
            modeGroup.add_child(new St.Label({text:'|', style_class: "suru-mode-seperator"}));

            archiveBox.add_child(archiveGroup);
            archiveBox.add_child(spacer);

            modeGroup.add_child(archiveBox);

            modeItem.add_child(modeGroup);
            //
            this.menu.addMenuItem(modeItem);


            const listMenuItem = new PopupMenu.PopupMenuItem("", {
                can_focus: false,
                hover: false,
                reactive: false,
                style_class: "my-suru-list-menu",
            });

            

            let todoContainer = new St.BoxLayout({
                vertical: true,
                style_class: "suru-layout-container",
            });
            scrollSuru.add_child(todoContainer);

            let archiveContainer = new St.BoxLayout({
                vertical: true,
                style_class: "suru-layout-container",
            });

            this._todoContainer = todoContainer;
            this._archiveContainer = archiveContainer;
            this._tasks.forEach((task) => {
                this._loadATask(task);
            });
            this._archive.forEach(ar=>{
                this._loadArchives(ar)
            })
            listMenuItem.add_child(scrollSuru);
            this.menu.addMenuItem(listMenuItem);
        }





















        _loadATask(task) {
        
            const bbox = new St.BoxLayout({ vertical: true, style_class: "suru-task", reactive: true });
            // The simple todo container :
            const hbox = new St.BoxLayout({ vertical: false, style_class: "suru-task-h" });

            const taskTools = new St.BoxLayout({ vertical: false, style_class: "suru-task-tools", visible:false });

            // check mark
            let checkMarkIcon = new St.Icon({
                icon_name: "object-select-symbolic",
                style_class: `suru-check-icon${task.state && "-checked"}`,
            });
            let checkBox = new St.Button({
                track_hover: true,
                reactive: true,
                can_focus: true,
                style_class: "my-suru-button-check",
            });
            // task text label : this._textState(task.state, task.text) , 320
            let taskLabel = new Clutter.Text({
                font_name: "Sans 10",
                text: this._textState(task.state, task.text),
                line_wrap: true,
                width: 360,
                color: Clutter.Color.from_string(this._colorState(task.state))[1],
                use_markup: true,
            });
            taskLabel.y_align = Clutter.ActorAlign.CENTER;


            bbox.connect("button-press-event", ()=>{
                if(!taskTools.visible){
                    taskTools.show();
                }else{
                    taskTools.hide();
                }
                
            })


            checkBox.connect("clicked", () => {
                let target = this._tasks.findIndex((i) => i.id == task.id);
                if (target == -1) return;
                let oldState = this._tasks[target].state;
                this._tasks = this._tasks.map((i) => (i.id == task.id ? { id: i.id, text: i.text, state: !oldState } : i));
                this._updateTodo();
                taskLabel.set_text(this._textState(!oldState, task.text));
                taskLabel.set_color(Clutter.Color.from_string(this._colorState(!oldState))[1]);
                taskLabel.use_markup = true;
                oldState ? checkMarkIcon.remove_style_class_name("suru-check-icon-checked") : checkMarkIcon.add_style_class_name("suru-check-icon-checked");
            });

            checkBox.add_child(checkMarkIcon);

            
            //  // delete button
            const deleteIcon = new St.Icon({
                icon_name: "user-trash-symbolic",
                style_class: "suru-trash-icon",
            });
            const deleteButton = new St.Button({
                style_class: "my-suru-button-del",
                track_hover: true,
                reactive: true,
                can_focus: true,
            });

            deleteButton.connect("clicked", () => {
                this._tasks = this._tasks.filter((i) => i.id != task.id);

                this._updateTodo();
                bbox.destroy();
                this._listCount.text = `${this._tasks.length}`;
            });
            deleteButton.add_child(deleteIcon);

            // // edit button
            const editIcon = new St.Icon({
                icon_name: "document-edit-symbolic",
                style_class: "suru-trash-icon",
            });
            const editButton = new St.Button({
                style_class: "my-suru-button-edit",
                track_hover: true,
                reactive: true,
                can_focus: true,
            });
            editButton.connect("clicked", () => {
                this._input.set_text(task.text);
                this._input.grab_key_focus();
                this._tasks = this._tasks.filter((i) => i.id != task.id);

                this._updateTodo();
                bbox.destroy();
                this._listCount.text = `${this._tasks.length}`;
            });
            editButton.add_child(editIcon);

            // // archive button 
            const archiveIcon = new St.Icon({
                icon_name: "folder-open-symbolic",
                style_class: "suru-archive-icon",
            });
            const archiveButton = new St.Button({
                style_class: "my-suru-button-arc",
                track_hover: true,
                reactive: true,
                can_focus: true,
            });
            archiveButton.add_child(archiveIcon);
            archiveButton.connect("clicked", () => {
                const newArchive = this._tasks.find(i=>i.id==task.id);
                this._archive.push(newArchive);
                this._updateArchive();
                this._loadArchives(newArchive);

                this._tasks = this._tasks.filter(i => i.id != task.id);
                this._updateTodo();
                bbox.destroy();
                this._listCount.text = `${this._tasks.length}`;

            });

            // assymbling 
            //hbox.add_child(checkBox);
            hbox.add_child(taskLabel);


           
            taskTools.add_child(checkBox);
            taskTools.add_child(editButton);
            taskTools.add_child(archiveButton);
            taskTools.add_child(deleteButton);

            bbox.add_child(taskTools);
            bbox.add_child(hbox);
           

            this._todoContainer.add_child(bbox);
        }










        _loadArchives(archive){
            const bbox = new St.BoxLayout({ vertical: true, style_class: "suru-task", reactive: true });
            // The simple todo container :
            const hbox = new St.BoxLayout({ vertical: false, style_class: "suru-task-h" });

            const archiveTools = new St.BoxLayout({ vertical: false, style_class: "suru-task-tools" , visible:false});

          
            let checkMarkIcon = new St.Icon({
                icon_name: "object-select-symbolic",
                style_class: `suru-check-icon${archive.state && "-checked"}`,
            });
            let checkBox = new St.Button({
                track_hover: true,
                reactive: true,
                can_focus: true,
                style_class: "my-suru-button-check",
            });
            checkBox.add_child(checkMarkIcon);
            // task text label : this._textState(task.state, task.text) , 320
            let archiveLabel = new Clutter.Text({
                font_name: "Sans 9",
                text: this._textState(archive.state, archive.text),
                line_wrap: false,
                width: 360,
                color: Clutter.Color.from_string(this._colorState(archive.state))[1],
                use_markup: true,
                ellipsize: Pango.EllipsizeMode.END,
            });
            archiveLabel.y_align = Clutter.ActorAlign.CENTER;
            bbox.connect("button-press-event", ()=>{
                if(archiveLabel.get_ellipsize() == Pango.EllipsizeMode.END){
                    archiveLabel.set_ellipsize(Pango.EllipsizeMode.NONE);
                    archiveLabel.set_line_wrap(true);
                    archiveTools.show();
                }else{
                    archiveLabel.set_ellipsize(Pango.EllipsizeMode.END);
                    archiveLabel.set_line_wrap(false);
                    archiveTools.hide();
                }
                
            })

            checkBox.connect("clicked", () => {
                let target = this._archive.findIndex((i) => i.id == archive.id);
                if (target == -1) return;
                let oldState = this._archive[target].state;
                this._archive = this._archive.map((i) => (i.id == archive.id ? { id: i.id, text: i.text, state: !oldState } : i));
                this._updateArchive();
                archiveLabel.set_text(this._textState(!oldState, archive.text));
                archiveLabel.set_color(Clutter.Color.from_string(this._colorState(!oldState))[1]);
                archiveLabel.use_markup = true;
                oldState ? checkMarkIcon.remove_style_class_name("suru-check-icon-checked") : checkMarkIcon.add_style_class_name("suru-check-icon-checked");
            });
            //  // delete button
            const deleteIcon = new St.Icon({
                icon_name: "user-trash-symbolic",
                style_class: "suru-trash-icon",
            });
            const deleteButton = new St.Button({
                style_class: "my-suru-button-del",
                track_hover: true,
                reactive: true,
                can_focus: true,
            });

            deleteButton.connect("clicked", () => {
                this._archive = this._archive.filter((i) => i.id != archive.id);

                this._updateArchive();
                bbox.destroy();
                this._listCount.text = `${this._archive.length}`;

            });
            deleteButton.add_child(deleteIcon);

            // // edit button
            const editIcon = new St.Icon({
                icon_name: "document-edit-symbolic",
                style_class: "suru-trash-icon",
            });
            const editButton = new St.Button({
                style_class: "my-suru-button-edit",
                track_hover: true,
                reactive: true,
                can_focus: true,
            });
            editButton.connect("clicked", () => {
                this._input.set_text(archive.text);
                this._input.grab_key_focus();
                this._archive = this._archive.filter((i) => i.id != archive.id);

                this._updateArchive();
                bbox.destroy();
                this._listCount.text = `${this._archive.length}`;

            });
            editButton.add_child(editIcon);

            // // archive button 
            const restoreIcon = new St.Icon({
                icon_name: "edit-undo-symbolic",
                style_class: "suru-archive-icon",
            });
            const restoreButton = new St.Button({
                style_class: "my-suru-button-arc",
                track_hover: true,
                reactive: true,
                can_focus: true,
            });
            restoreButton.add_child(restoreIcon);
            restoreButton.connect("clicked", () => {
                let newTask = this._archive.find(i=>i.id==archive.id);
                this._archive = this._archive.filter((i) => i.id != archive.id);
                this._updateArchive();

                
                this._tasks.push(newTask);
                this._updateTodo();
                this._loadATask(newTask);
                bbox.destroy();
                this._listCount.text = `${this._archive.length}`;

            });

            // assymbling 
            //hbox.add_child(checkBox);
            hbox.add_child(archiveLabel);


           
            archiveTools.add_child(checkBox);
            archiveTools.add_child(editButton);
            archiveTools.add_child(restoreButton);
            archiveTools.add_child(deleteButton);

            bbox.add_child(archiveTools);
            bbox.add_child(hbox);
           

            this._archiveContainer.insert_child_at_index(bbox, 0);
        }


        _TempId() {
            return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        }

        _colorState(state) {
            return state ? "#616161" : "#FFFFFF";
        }
        _textState(state, text) {
            return state ? `<s>${text}</s>` : text;
        }

        _updateTodo(){
            this._settings.set_value(
                "todo-items",
                new GLib.Variant(
                    "a(sb)",
                    this._tasks.map((i) => [i.text, i.state]),
                ),
            );
        }

        _updateArchive(){
            this._settings.set_value(
                "archive-items",
                new GLib.Variant(
                    "a(sb)",
                    this._archive.map((i) => [i.text, i.state]),
                ),
            );
        }

    },
);









export default class SuruListExtension extends Extension {
    enable() {
        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
