import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AdminGroup } from '../../../shared/models';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { GROUP_CODE_PATTERN } from '../../../shared/utils/validators';

/** Create a group (R13 AC6): name + code. Closes with the new group. */
@Component({
  selector: 'app-admin-group-dialog',
  standalone: false,
  templateUrl: './admin-group-dialog.html',
  styleUrl: './admin-group-dialog.scss',
})
export class AdminGroupDialog {
  private readonly admin = inject(AdminService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject<MatDialogRef<AdminGroupDialog, AdminGroup>>(MatDialogRef);

  protected readonly saving = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    code: ['', [Validators.required, Validators.pattern(GROUP_CODE_PATTERN)]],
  });

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, code } = this.form.getRawValue();
    this.saving.set(true);
    this.admin.createGroup(name.trim(), code.trim(), skipErrorSnackbar()).subscribe({
      next: (group) => {
        this.notification.success(`Group "${group.name}" created`);
        this.dialogRef.close(group);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        // "Code taken" comes as `group.code` (shared with register); this form's control is just `code`.
        const codeTaken: string | undefined = err.error?.errors?.['group.code'];
        if (codeTaken) {
          this.form.controls.code.setErrors({ server: codeTaken });
          this.form.controls.code.markAsTouched();
        } else if (!applyServerErrors(this.form, err)) {
          this.notification.error(errorMessage(err));
        }
      },
    });
  }
}
