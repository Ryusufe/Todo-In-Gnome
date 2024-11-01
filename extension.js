import GObject from "gi://GObject";
import St from "gi://St";
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import Cogl from 'gi://Cogl'
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


            // inner
            this._settings = extensionObject.getSettings();
            this._tasks = this._settings
                .get_value("todo-items")
                .deep_unpack()
                .map((i, index) => ({ id: this._TempId(), text: i[0], state: i[1] }));
            this._archive = this._settings.get_value("archive-items").deep_unpack()
            .map((i, index) => ({ id: this._TempId(), text: i[0], state: i[1] }));

            this._lists = this._settings
                .get_value("lists")
                .deep_unpack()
                .map((i) => ({ tasks: i[0].map(j=>({id: this._TempId(), text:j[0], state:j[1]})), archives: i[1].map(j=>({id: this._TempId(), text:j[0], state:j[1]})) }));

            this._listsInfo = this._settings
                .get_value("lists-info")
                .deep_unpack()
                .map((i) => ({ title: i[0], state: i[1] }));

            this._currentList = this._listsInfo.findIndex(i=>i.state==true);


            const title = new PopupMenu.PopupMenuItem("",{
                can_focus: false,
                hover: false,
                reactive: false,
                style_class: "my-menu-item-title",
            });
            
            //suruこと
            const TitleInfo = new St.BoxLayout({
                vertical: false,
                style_class: "suru-title-container",
                x_expand: true
            });
            const indexLabel = new St.Label({
                text: `  •  ${this._currentList+1}`,
                style_class: "my-title-ind",
            });
            this._titleIndex = indexLabel;
            const tdLabel = new St.Label({
                text: `, Todo`,
                style_class: "my-title-td",
            });
            const titleLabel = new St.Label({
                text: `${this._listsInfo[this._currentList].title}`,
                style_class: "my-title",
                
            });
            this._title = titleLabel;

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

            
            TitleInfo.add_child(titleLabel);
            TitleInfo.add_child(tdLabel);
            TitleInfo.add_child(indexLabel);
            title.add_child(TitleInfo);
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
                this._req_lists = task=='!l';
                task = this._req_lists ? this._listsInfo.map((i, index)=>` ${i.state?'• ':'  '} ${index+1} : ${i.title}`).join('\n') : task;
                
                if(/^(@)(\d+)$/.test(task)){
                    // @234 @1 go to 1
                    const wIndex = task.match(/(?<=@)(\d+)$/)[0];

                    if(wIndex<=this._listsInfo.length){

                        this._listHasChanged(wIndex-1);
                      
                    }               
                            
                }
                else if (/^(@)((?!\d)[\w\s]+)$/.test(task)){
                    // @List 1
                    const wList = task.match(/(?<=@)([\w\s]+)$/)[0];
                    if(this._listsInfo.map(i=>i.title.toLowerCase()).includes(wList.toLowerCase())){
                    
                        this._listHasChanged(this._listsInfo.findIndex(i=>i.title.toLowerCase()==wList.toLowerCase()));  

                    }
                    

                }
                else if(/^(@(\d+))::((?!\d)[\w\s]+)$/.test(task)){
                    // CHANGE THE NAME OF THE TARGETED TODO LIST by index
                    // @1::new Name
                    const wTarget = task.match(/(?<=@)(\d+)(?=::)/)[0];
                    const wTitle = task.match(/(?<=::)([\w\s]+)$/)[0];
                    if(wTarget<=this._listsInfo.length){
                        this._listsInfo = this._listsInfo.map((i, index)=>({ title: (wTarget-1==index ? wTitle : i.title), state: i.state }));
                        this._settings.set_value(
                            "lists-info",
                            new GLib.Variant(
                                "a(sb)",
                                this._listsInfo.map((i) => [i.title, i.state]),
                            ),
                        );
                        if(this._currentList==wTarget-1){
                            this._title.text = `${wTitle}`
                        }
                    }                
                }
                else if(/^(@((?!\d)[\w\s]+))::((?!\d)[\w\s]+)$/.test(task)){
                    // @Old Name::New Name
                    const wTarget = task.match(/(?<=@)([\w\s]+)(?=::)/)[0];
                    const wTitle = task.match(/(?<=::)([\w\s]+)$/)[0];
                    if(this._listsInfo.map(i=>i.title.toLowerCase()).includes(wTarget.toLowerCase())){
                        this._listsInfo = this._listsInfo.map((i)=>({ title: (wTarget==i.title ? wTitle : i.title), state: i.state }));
                        this._settings.set_value(
                            "lists-info",
                            new GLib.Variant(
                                "a(sb)",
                                this._listsInfo.map((i) => [i.title, i.state]),
                            ),
                        );
                        if(this._listsInfo[this._currentList].title == wTitle){
                            this._title.text = `${wTitle}`
                        }
                    }
                }
                else if (/^(\+::)((?!\d)[\w\s]+)$/.test(task)){
                    // +::New Group
                    const wTitle = task.match(/(?<=\+::)([\w\s]+)$/)[0];
                    this._createList(`${wTitle}`);
                }
                else if (/^(-::@)(\d+)$/.test(task)){
                    // -::@remove Group
                    const wIndex = task.match(/(?<=-::@)(\d+)$/)[0];
                    const exists = this._listsInfo.length >= wIndex;
                    (exists && wIndex!=1) && this._deleteList(wIndex-1);
                }
                else if (/^(-::@)((?!\d)[\w\s]+)$/.test(task)){
                    // -::@1
                    const wTitle = task.match(/(?<=-::@)([\w\s]+)$/)[0];
                    const wIndex = this._listsInfo.findIndex(i=>i.title.toLowerCase() == wTitle.toLowerCase());
                    (wIndex && wIndex!=0) && this._deleteList(wIndex);
                }
                else{
                    
                    
                    if(this._currentList == 0){
                        if(this._mode){
                            
                            const newTask = { id: this._TempId(), text: task, state: false };
                            if(this._req_lists){
                                this._tasks.unshift(newTask);
                            }
                            else{
                                this._tasks.push(newTask);
                            }

                            
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
                    }
                    else{

                        if(this._mode){
                            const newTask = { id: this._TempId(), text: task, state: false };
                            const tList = this._listsInfo.findIndex(i=>i.state===true);
                            if(this._req_lists){
                                this._lists[tList-1].tasks.unshift(newTask);
                            }
                            else{
                                this._lists[tList-1].tasks.push(newTask);
                            }
                            this._updateLists();
                            this._loadATask(newTask);
                            this._listCount.text = `${this._lists[tList-1].tasks.length}`;
                        }
                        else{
                            const newArchive = { id: this._TempId(), text: task, state:false };
                            const tList = this._listsInfo.findIndex(i=>i.state===true);
                            this._lists[tList-1].archives.push(newArchive);
                            this._updateLists();
                            this._loadArchives(newArchive);
                            this._listCount.text = `${this._lists[tList-1].archives.length}`;

                        }
                    }
    
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
                    this._listHasChanged(this._currentList);
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
                    this._listHasChanged(this._currentList);
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

            this._updateDisplayedLists(this._currentList);
            
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
                color: Cogl.Color.from_string(this._colorState(task.state))[1],
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
                if(this._currentList==0){
                    let target = this._tasks.findIndex((i) => i.id == task.id);
                    if (target == -1) return;
                    let oldState = this._tasks[target].state;
                    this._tasks = this._tasks.map((i) => (i.id == task.id ? { id: i.id, text: i.text, state: !oldState } : i));
                    this._updateTodo();
                    taskLabel.set_text(this._textState(!oldState, task.text));
                    taskLabel.set_color(Cogl.Color.from_string(this._colorState(!oldState))[1]);
                    taskLabel.use_markup = true;
                    oldState ? checkMarkIcon.remove_style_class_name("suru-check-icon-checked") : checkMarkIcon.add_style_class_name("suru-check-icon-checked");
                }else{
                    let target = this._lists[this._currentList-1].tasks.findIndex((i) => i.id == task.id);
                    let oldState = this._lists[this._currentList-1].tasks[target].state;
                    this._lists[this._currentList-1].tasks = this._lists[this._currentList-1].tasks.map((i) => (i.id == task.id ? { id: i.id, text: i.text, state: !oldState } : i));
                    this._updateLists();
                    taskLabel.set_text(this._textState(!oldState, task.text));
                    taskLabel.set_color(Cogl.Color.from_string(this._colorState(!oldState))[1]);
                    taskLabel.use_markup = true;
                    oldState ? checkMarkIcon.remove_style_class_name("suru-check-icon-checked") : checkMarkIcon.add_style_class_name("suru-check-icon-checked");
                }
                
            
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
                if(this._currentList == 0){
                    this._tasks = this._tasks.filter((i) => i.id != task.id);

                    this._updateTodo();
                    bbox.destroy();
                    this._listCount.text = `${this._tasks.length}`;
                }else{
                    this._lists[this._currentList-1].tasks = this._lists[this._currentList-1].tasks.filter((i) => i.id != task.id);

                    this._updateLists();
                    bbox.destroy();
                    this._listCount.text = `${this._lists[this._currentList-1].tasks.length}`;
                }
                
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
                if(this._currentList==0){
                    this._tasks = this._tasks.filter((i) => i.id != task.id);

                    this._updateTodo();
                    this._listCount.text = `${this._tasks.length}`;
                }
                else{
                    this._lists[this._currentList-1].tasks = this._lists[this._currentList-1].tasks.filter((i) => i.id != task.id);
                    this._updateLists();
                    this._listCount.text = `${this._lists[this._currentList-1].tasks.length}`;
                }
                
                bbox.destroy();
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
                if(this._currentList==0){
                    const newArchive = this._tasks.find(i=>i.id==task.id);
                    this._archive.push(newArchive);
                    this._updateArchive();
                    this._loadArchives(newArchive);
    
                    this._tasks = this._tasks.filter(i => i.id != task.id);
                    this._updateTodo();
                    this._listCount.text = `${this._tasks.length}`;
                }
                else{
                    const newArchive = this._lists[this._currentList-1].tasks.find(i=>i.id==task.id);
                    this._lists[this._currentList-1].archives.push(newArchive);
                    this._loadArchives(newArchive);
                    this._lists[this._currentList-1].tasks = this._lists[this._currentList-1].tasks.filter(i => i.id != task.id);
                    this._updateLists();
                    this._listCount.text = `${this._lists[this._currentList-1].tasks.length}`;

                }
                bbox.destroy();
                

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
           
            if(this._req_lists){
                this._todoContainer.insert_child_at_index(bbox, 0);
                return;
            }
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
                color: Cogl.Color.from_string(this._colorState(archive.state))[1],
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
                if(this._currentList==0){
                    let target = this._archive.findIndex((i) => i.id == archive.id);
                    if (target == -1) return;
                    let oldState = this._archive[target].state;
                    this._archive = this._archive.map((i) => (i.id == archive.id ? { id: i.id, text: i.text, state: !oldState } : i));
                    this._updateArchive();
                    archiveLabel.set_text(this._textState(!oldState, archive.text));
                    archiveLabel.set_color(Cogl.Color.from_string(this._colorState(!oldState))[1]);
                    archiveLabel.use_markup = true;
                    oldState ? checkMarkIcon.remove_style_class_name("suru-check-icon-checked") : checkMarkIcon.add_style_class_name("suru-check-icon-checked");
                }
                else{
                    let target = this._lists[this._currentList-1].archives.findIndex((i) => i.id == archive.id);
                    let oldState = this._lists[this._currentList-1].archives[target].state;
                    this._lists[this._currentList-1].archives = this._lists[this._currentList-1].archives.map((i) => (i.id == archive.id ? { id: i.id, text: i.text, state: !oldState } : i));
                    this._updateLists();
                    archiveLabel.set_text(this._textState(!oldState, archive.text));
                    archiveLabel.set_color(Cogl.Color.from_string(this._colorState(!oldState))[1]);
                    archiveLabel.use_markup = true;
                    oldState ? checkMarkIcon.remove_style_class_name("suru-check-icon-checked") : checkMarkIcon.add_style_class_name("suru-check-icon-checked");
                }

                
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
                if(this._currentList==0){
                    this._archive = this._archive.filter((i) => i.id != archive.id);

                    this._updateArchive();
                    bbox.destroy();
                    this._listCount.text = `${this._archive.length}`;
                }
                else{
                    this._lists[this._currentList-1].archives = this._lists[this._currentList-1].archives.filter((i) => i.id != archive.id);

                    this._updateLists();
                    bbox.destroy();
                    this._listCount.text = `${this._lists[this._currentList-1].archives.length}`;
                }
                
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
                if(this._currentList==0){
                    this._archive = this._archive.filter((i) => i.id != archive.id);
                    this._updateArchive();                
                    this._listCount.text = `${this._archive.length}`;

                }
                else{
                    this._lists[this._currentList-1].archives = this._lists[this._currentList-1].archives.filter((i) => i.id != archive.id);
                    this._updateLists();
                    this._listCount.text = `${this._lists[this._currentList-1].archives.length}`;
                }
                bbox.destroy();

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
                if(this._currentList==0){
                    let newTask = this._archive.find(i=>i.id==archive.id);
                    this._archive = this._archive.filter((i) => i.id != archive.id);
                    this._updateArchive();
    
                    
                    this._tasks.push(newTask);
                    this._updateTodo();
                    this._loadATask(newTask);
                    this._listCount.text = `${this._archive.length}`;
                }
                else{
                    const newTask = this._lists[this._currentList-1].archives.find(i=>i.id==archive.id);
                    this._lists[this._currentList-1].archives.push(newTask);
                    this._loadATask(newTask);
                    this._lists[this._currentList-1].archives = this._lists[this._currentList-1].archives.filter(i => i.id != archive.id);
                    this._updateLists();
                    this._listCount.text = `${this._lists[this._currentList-1].archives.length}`;

                }
               
                bbox.destroy();

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
        //

        _listHasChanged(tList){
            this._listsInfo = this._listsInfo.map((i,index)=>({ title: i.title, state: index==tList }));
       
            this._settings.set_value(
                "lists-info",
                new GLib.Variant(
                    "a(sb)",
                    this._listsInfo.map((i) => [i.title, i.state]),
                ),
            );
            this._currentList = tList;
            if(tList!=0){
                this._listCount.text = `${this._mode ? this._lists[tList-1].tasks.length: this._lists[tList-1].archives.length}`;
            }
            else{
                this._listCount.text = `${this._mode ? this._tasks.length : this._archive.length}`;   
            }
            this._titleIndex.text = `  •  ${this._currentList+1}`;
            this._updateDisplayedLists(tList);
            this._title.text = `${this._listsInfo[tList].title}`;
        }

        _updateDisplayedLists(tList){
            
            this._todoContainer.destroy_all_children();
            this._archiveContainer.destroy_all_children();
            if(tList>0){
                const targetList = this._lists[tList-1];
                targetList.tasks.forEach((task) => {
                    this._loadATask(task);
                });
                targetList.archives.forEach(ar=>{
                    this._loadArchives(ar)
                });
            }
            else{
                this._tasks.forEach((task) => {
                    this._loadATask(task);
                });
                this._archive.forEach(ar=>{
                    this._loadArchives(ar)
                })
            }
        }


        _updateLists(){
            this._settings.set_value(
                "lists",
                new GLib.Variant(
                    "aaa(sb)",
                    this._lists.map(group => [
                        group.tasks.map(item => [item.text, item.state]),
                        group.archives.map(item => [item.text, item.state])
                    ])
                ),
            );
        }
        
        _createList(title){
            this._listsInfo.push({title:title, state:false });
            this._lists.push({tasks:[{ id: this._TempId(), text: "Example", state: false }], archives:[{ id: this._TempId(), text: "Example", state: false }]});
            this._updateLists();
            this._listHasChanged(this._listsInfo.length-1);
        }

        _deleteList(tIndex){
            this._listsInfo = this._listsInfo.filter((i, index)=> index!=tIndex);
            this._lists = this._lists.filter((i, index)=> index!=tIndex-1);
            this._updateLists();
            
            this._listHasChanged(this._currentList == tIndex ? this._listsInfo.length-1 : this._currentList);
            
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
