/**
 * menuHelper.js — Menu helper utilities for 8Router TUI.
 *
 * Provides:
 *   - showMenuWithBack(config) — Loop menu with refresh capability
 *   - showListMenu(config)     — Dynamic list menu with fetch/format/select
 */

import { selectMenu } from "./input.js";

/**
 * Show a menu with a "Back" button at top, handle selection in a loop.
 *
 * @param {Object} config – Menu configuration
 * @param {string}   config.title          – Menu title
 * @param {string}   [config.headerContent=""] – Optional header content (string or async fn)
 * @param {Array<{label: string|Function, action?: Function}>} config.items – Menu items
 * @param {string}   [config.backLabel="← Back"] – Back button label
 * @param {number}   [config.defaultIndex=0]   – Default selected index
 * @param {Function} [config.refresh=null]     – Optional async refresh fn called each loop
 * @param {string[]} [config.breadcrumb=[]]    – Optional breadcrumb path
 * @returns {Promise<void>}
 */
export async function showMenuWithBack(config) {
  const {
    title,
    headerContent = "",
    items,
    backLabel = "← Back",
    defaultIndex = 0,
    refresh = null,
    breadcrumb = [],
  } = config;

  while (true) {
    // Call refresh if provided
    let refreshedData = null;
    if (refresh) {
      refreshedData = await refresh();
      if (refreshedData === null) {
        // Refresh failed, exit menu
        return;
      }
    }

    // Build menu items with back at top
    const menuItems = [
      { label: backLabel },
      ...items.map((item) => ({
        label: typeof item.label === "function" ? item.label(refreshedData) : item.label,
      })),
    ];

    // Resolve headerContent if it's a function
    const resolvedHeader =
      typeof headerContent === "function"
        ? await headerContent(refreshedData)
        : headerContent;

    const selected = await selectMenu(
      title,
      menuItems,
      defaultIndex,
      "",
      resolvedHeader,
      breadcrumb
    );

    // Back or ESC
    if (selected === -1 || selected === 0) {
      return;
    }

    // Execute action for selected item
    const actionIndex = selected - 1;
    const item = items[actionIndex];

    if (item && item.action) {
      const shouldContinue = await item.action(refreshedData);
      // If action returns false, exit menu
      if (shouldContinue === false) {
        return;
      }
    }
  }
}

/**
 * Show a list menu where items are fetched dynamically.
 *
 * @param {Object} config – Menu configuration
 * @param {string}   config.title          – Menu title
 * @param {string}   [config.headerContent=""] – Optional header content (string or async fn)
 * @param {Function} config.fetchItems     – Async fn to fetch items { items: [], metadata?: {} }
 * @param {Function} config.formatItem     – Fn to format each item to display label
 * @param {Function} config.onSelect       – Async fn called when item is selected
 * @param {Object}   [config.createAction=null] – Optional create action { label, action }
 * @param {string}   [config.backLabel="← Back"] – Back button label
 * @param {string[]} [config.breadcrumb=[]]    – Optional breadcrumb path
 * @returns {Promise<void>}
 */
export async function showListMenu(config) {
  const {
    title,
    headerContent = "",
    fetchItems,
    formatItem,
    onSelect,
    createAction = null,
    backLabel = "← Back",
    breadcrumb = [],
  } = config;

  while (true) {
    // Fetch items
    const result = await fetchItems();
    if (!result) {
      return;
    }

    const items = result.items ?? [];
    const metadata = result.metadata ?? {};

    // Build menu items
    const menuItems = [{ label: backLabel }];

    if (createAction) {
      menuItems.push({ label: createAction.label });
    }

    items.forEach((item) => {
      const formatted = formatItem(item);
      menuItems.push({ label: formatted });
    });

    const header =
      typeof headerContent === "function"
        ? await headerContent(metadata)
        : headerContent;

    const selected = await selectMenu(
      title,
      menuItems,
      0,
      "",
      header,
      breadcrumb
    );

    // Back or ESC
    if (selected === -1 || selected === 0) {
      return;
    }

    // Create action
    if (createAction && selected === 1) {
      await createAction.action();
      continue;
    }

    // Select item
    const offset = createAction ? 2 : 1;
    const itemIndex = selected - offset;

    if (itemIndex >= 0 && itemIndex < items.length) {
      await onSelect(items[itemIndex]);
    }
  }
}
