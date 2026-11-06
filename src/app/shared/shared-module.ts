import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { InrCurrencyPipe } from './pipes/inr-currency.pipe';
import { PaymentMethodLabelPipe } from './pipes/payment-method-label.pipe';
import { PageHeader } from './components/page-header/page-header';
import { EmptyState } from './components/empty-state/empty-state';
import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog';
import { CategoryChip } from './components/category-chip/category-chip';
import { MonthPicker } from './components/month-picker/month-picker';
import { BudgetProgress } from './components/budget-progress/budget-progress';
import { ExpenseListItem } from './components/expense-list-item/expense-list-item';
import { ExpenseFormDialog } from './components/expense-form-dialog/expense-form-dialog';
import { AddExpenseButton } from './components/add-expense-button/add-expense-button';

/** Every Angular Material module the app uses (design §4). Features never import these directly. */
const MATERIAL_MODULES = [
  MatToolbarModule,
  MatSidenavModule,
  MatListModule,
  MatIconModule,
  MatButtonModule,
  MatCardModule,
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatAutocompleteModule,
  MatDatepickerModule,
  MatDialogModule,
  MatBottomSheetModule,
  MatSnackBarModule,
  MatChipsModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatMenuModule,
  MatTooltipModule,
  MatDividerModule,
  MatBadgeModule,
  MatButtonToggleModule,
];

const ANGULAR_MODULES = [CommonModule, FormsModule, ReactiveFormsModule, RouterModule];

/** Reusable components + pipes (NFR6). Declared and exported here, used by every feature. */
const DECLARATIONS = [
  PageHeader,
  EmptyState,
  ConfirmDialog,
  CategoryChip,
  MonthPicker,
  BudgetProgress,
  ExpenseListItem,
  ExpenseFormDialog,
  AddExpenseButton,
  InrCurrencyPipe,
  PaymentMethodLabelPipe,
];

/**
 * SharedModule — the ONLY module feature modules import for UI (CLAUDE.md, design §4, NFR6).
 * Re-exports Angular + Material modules so a feature needs a single import, and declares the
 * reusable components / pipes. No providers here: services live in core/ (providedIn: 'root'),
 * otherwise every lazy module importing SharedModule would get its own service instance.
 */
@NgModule({
  declarations: [...DECLARATIONS],
  imports: [...ANGULAR_MODULES, ...MATERIAL_MODULES],
  exports: [...ANGULAR_MODULES, ...MATERIAL_MODULES, ...DECLARATIONS],
})
export class SharedModule {}
