# Todo-In-Gnome
`Gnome v47`
- for gnome 46 download it from the [Extension Manager](##Installation).

## Description

The GNOME To-Do Extension is a lightweight and user-friendly extension designed to help you manage your tasks efficiently. With a minimalistic interface, it allows you to add, modify, and delete tasks effortlessly. No complicated settings, just pure productivity!

> **Noticeable Feature:** For styling your tasks you can use [Pango](https://docs.gtk.org/Pango/pango_markup.html).


## Showcase Usage :

![Todo List Screenshot](https://raw.githubusercontent.com/Ryusufe/Todo-In-Gnome/refs/heads/main/screenshots/Recording%202024-10-12%20at%2002.18.36.gif)

## Installation

You can install the GNOME To-Do Extension via the [Extension Manager](https://github.com/mjakeman/extension-manager) at [Todo, すること](https://extensions.gnome.org/extension/7418/todo/).
Or via the command line. Follow these steps:

1. **Navigate to the GNOME extensions directory**:
```bash
cd ~/.local/share/gnome-shell/extensions/
```
2. **Clone the repository into a new folder named `suru@ryusufe.github.io`**:
```bash
git clone https://github.com/ryusufe/Todo-In-Gnome.git suru@ryusufe.github.io
```
3. **Restart GNOME Shell**:
  - X11 : press `Alt + F2`, type `r`, and hit `Enter`.
  - wayland : log out and log back in.
4. **Enable the extension**:
 ```bash
 gnome-extensions enable suru@ryusufe.github.io
 ```
## Special Input : 

The following syntax enables efficient navigation, creation, deletion, and renaming of your to-do lists:

### Navigation

  `@2` – Navigates to the to-do list identified by its number, here list `2`.
  
  `@Groceries` – Accesses the to-do list with the name `Groceries`.

### List Creation

  `+::Work Projects` – Creates a new to-do list with the name `Work Projects`.

### List Deletion

  `-::@2` – Deletes the to-do list at index `2`.
  
  `-::@Chores` – Removes the to-do list with the name `Chores`.

### Renaming Lists

  `@2::Weekend Plans` – Renames the to-do list at index `2` to `Weekend Plans`.
  
  `@Vacation::Trip Itinerary` – Changes the name of the list `Vacation` to `Trip Itinerary`.

### Help

  `!l` – Adds an item with all current lists and they number and state.

This syntax provides a streamlined way to manage your lists intuitively through direct special inputs.




## Donation

<a href="https://buymeacoffee.com/ryusufe">
  <img src="https://ucbcd975be5592f4047c73e2240d.previews.dropboxusercontent.com/p/thumb/ACb4DLqk2GsV9k-HKfeQa76yo0u0lFa-lOoHnzYVnilRqEANDTObjNfK63zEa3nGP33KytY-9kpjp6kOFXU1WFxZ4xyX7LQCnBBPwOCTTtG9KdwHtnq_esB1teIbOQ6QkfEYQ7VmH1TwCKAFvtNcH2fSNighpvhLM9qJBzoEzJ7hcS-ItW3cgOBeP-VNxZ4gEWm1-tgr6N7pmQHMKWYuDxLcFCjMhW1wOO_xp8XiABYM-0PZEtzdI7t0FUIp7YCuDri4NGF4-ZEtvVohfgQJ9ugg4JVj7P-Ra20DVgQJOE9E82NbZ51Qh4Z62PmZehBOj8jb4_3HcDj0PLfI_sW7EJsFuCoFKP_pKjmrpvL4zvidPw/p.png" alt="Buy me a coffee" style="width:300px;border-radius:10px" />
</a>


