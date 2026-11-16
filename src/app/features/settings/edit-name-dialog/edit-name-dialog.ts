import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { applyServerErrors } from '../../../shared/utils/server-errors';

/**
 * Settings → profile card pencil (R13 AC4; v6 layout R25 AC1, design §14.4). Same rules as the old inline form:
 * required, max 40, server field errors under the field. Closes with true when saved.
 */
@Component({
  selector: 'app-edit-name-dialog',
  standalone: false,
  templateUrl: './edit-name-dialog.html',
  styleUrl: '../settings-dialog.scss',
})
export class EditNameDialog {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject<MatDialogRef<EditNameDialog, boolean>>(MatDialogRef);

  protected readonly saving = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [inject<string>(MAT_DIALOG_DATA), [Validators.required, Validators.maxLength(40)]],
  });

  static open(dialog: MatDialog, currentName: string): Observable<boolean> {
    return dialog
      .open<EditNameDialog, string, boolean>(EditNameDialog, {
        data: currentName,
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'input',
      })
      .afterClosed()
      .pipe(map(Boolean));
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) return;
    if (this.form.pristine) {
      this.dialogRef.close(false);
      return;
    }
    this.saving.set(true);
    this.auth.updateName(this.form.getRawValue().name.trim(), skipErrorSnackbar()).subscribe({
      next: () => {
        this.notification.success('Name updated');
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
      },
    });
  }
}
