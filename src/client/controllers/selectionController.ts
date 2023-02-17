import { computed, shallowReactive, watch } from "vue";
import { Graphics } from "@pixi/graphics";
import { Rectangle } from "@pixi/math";

import { Draggable } from "client/base/draggable";
import { $getEventCenter, $isTouch } from "./share";
import { boundary, stage, ui } from "client/screen/display";
import ProjectService from "client/services/projectService";
import { CursorController } from "./cursorController";

import type { DragSelectable } from "client/base/draggable";
import type { ComputedRef } from "vue";
import type { Control } from "client/base/control";

export interface ISelectionController {
	readonly selections: readonly Control[];
	readonly draggables: ComputedRef<Draggable[]>;
	selectAll(): void;
	clear(): void;
}

interface HitStatus {
	/** The last {@link Control} in the stacking. */
	current: Control | null;

	/** The next unselected {@link Control} in the stacking. */
	next: Control | null;
}

/**
 * Overly narrowed rectangle can cause trouble in Pixi,
 * so we put a lower limit.
 */
const MIN_WIDTH = 0.5;

const TOUCH_THRESHOLD = 20;
const MOUSE_THRESHOLD = 5;
const COLOR = 0x6699ff;
const ALPHA = 0.2;

//=================================================================
/**
 * {@link SelectionController} manages the selection logics of {@link Control}s.
 */
//=================================================================

export namespace SelectionController {

	let possiblyReselect: boolean = false;

	let statusCache: HitStatus;

	let downPoint: IPoint;

	let dragSelectables: DragSelectable[];

	// Creates the drag selection view.
	// Since it is just a rectangle, there's no need for SmoothGraphics
	const view = new Graphics();
	view.visible = false;
	ui.addChild(view);

	export const selections: Control[] = shallowReactive([]);

	watch(ProjectService.sheet, sheet => {
		selections.length = 0;
		if(!sheet) return;
		for(const c of sheet.$controls) {
			if(c.$selected) selections.push(c);
		}
	});

	export const draggables = computed(() =>
		selections.filter(
			(c: Control): c is Draggable => c instanceof Draggable
		)
	);

	export function clear(ctrl: Control | null = null): void {
		selections.forEach(c => {
			if(c !== ctrl) c.$selected = false;
		});
		selections.length = 0;
		if(ctrl?.$selected) selections.push(ctrl);
	}

	export function selectAll(): void {
		const sheet = ProjectService.sheet.value;
		if(!sheet) return;
		for(const c of sheet.$controls) $toggle(c, true);
	}

	/** Handles hit, and compares if the selection state remains the same. */
	export function $compare(event: TouchEvent): boolean {
		const oldSel = draggables.value.concat();
		$process(event);
		const newSel = draggables.value.concat();
		if(oldSel.length != newSel.length) return false;
		for(const o of oldSel) if(!newSel.includes(o)) return false;
		return true;
	}

	export function $process(event: MouseEvent | TouchEvent, ctrlKey?: boolean): void {
		if(event instanceof MouseEvent) ctrlKey ??= event.ctrlKey || event.metaKey;
		downPoint = $getEventCenter(event);
		const { current, next } = getStatus();

		// Selection logic for mouse click
		if(!ctrlKey) {
			if(!current) clear();
			if(!current && next) select(next);
		} else {
			if(current && !next) $toggle(current, !current.$selected);
			if(next) select(next);
		}
	}

	export function $processNext(): void {
		const { current, next } = statusCache;
		const project = ProjectService.project.value;
		if(project && !project.$isDragging) {
			if(current && next) clear();
			if(current && !next) clear(current);
			if(next) select(next);
		}
	}

	export function $tryReselect(event: MouseEvent | TouchEvent): boolean {
		if(!possiblyReselect) return false;

		clear();
		$process(event, false);
		for(const o of draggables.value) o.$dragStart(CursorController.$offset);
		possiblyReselect = false;
		return true;
	}

	/**
	 * End drag-selection and returns in drag-selection was in progress.
	 *
	 * @param cancel Should we cancel the selection already made
	 */
	export function $endDrag(cancel?: boolean): boolean {
		const result = view.visible;
		if(result && cancel) clear();
		view.visible = false;
		stage.interactiveChildren = true;
		dragSelectables = [];
		return result;
	}

	export function $processDragSelect(event: MouseEvent | TouchEvent): void {
		const point = $getEventCenter(event);
		const sheet = ProjectService.sheet.value!;

		// Initialization
		if(!view.visible) {
			// Must drag to a certain distance to trigger drag-selection.
			const dist = getDistance(downPoint, point);
			if(dist < ($isTouch(event) ? TOUCH_THRESHOLD : MOUSE_THRESHOLD)) return;
			clear();
			view.visible = true;
			stage.interactiveChildren = false;
			dragSelectables = [...sheet.$controls].filter(
				(c: Control): c is DragSelectable => Boolean((c as DragSelectable).$anchor)
			);
		}

		// Draws the rectangle
		let w = Math.abs(downPoint.x - point.x);
		let h = Math.abs(downPoint.y - point.y);
		if(w < MIN_WIDTH) w = MIN_WIDTH;
		if(h < MIN_WIDTH) h = MIN_WIDTH;
		view.clear()
			.lineStyle({ width: 1, color: COLOR })
			.beginFill(COLOR, ALPHA)
			.drawRect(
				Math.min(downPoint.x, point.x),
				Math.min(downPoint.y, point.y),
				w, h
			)
			.endFill();

		// Calculate the corresponding coordinates of the rectangle.
		const bounds = view.getBounds();
		const matrix = sheet.$view.localTransform;
		const pt = matrix.applyInverse({ x: bounds.left, y: bounds.bottom });
		const rect = new Rectangle(pt.x, pt.y, bounds.width / matrix.a, bounds.height / matrix.a);

		// Check selected objects (linear search is good enough for the moment).
		for(const ds of dragSelectables) {
			$toggle(ds, rect.contains(ds.$anchor.x, ds.$anchor.y));
		}
	}

	export function $toggle(c: Control, selected: boolean): void {
		if(c.$selected == selected) return;
		c.$selected = selected;
		if(selected) selections.push(c);
		else selections.splice(selections.indexOf(c), 1);
	}

	function getStatus(): HitStatus {

		let first: Control | null = null;	// The first Control in the stacking
		let current: Control | null = null;
		let next: Control | null = null;

		// Find all Controls at the hit position
		const sheet = ProjectService.sheet.value!;
		const controls = boundary.$hitTestAll(sheet, downPoint);

		// Find the three critical Controls
		for(const o of controls) {
			if(!first) first = o;
			if(o.$selected) current = o;
			else if(current && !next) next = o;
		}
		if(!next && first && !first.$selected) next = first;

		if(current) {
			const p = current.$priority;
			if(controls.some(c => c.$priority > p)) {
				possiblyReselect = true;
			}
		}

		return statusCache = { current, next };
	}

	function select(c: Control): void {
		if(!c.$selected && (selections.length == 0 || selections[0].$selectableWith(c))) {
			c.$selected = true;
			selections.push(c);
		}
	}

	function getDistance(p1: IPoint, p2: IPoint): number {
		const dx = p1.x - p2.x, dy = p1.y - p2.y;
		return Math.sqrt(dx * dx + dy * dy);
	}
}
