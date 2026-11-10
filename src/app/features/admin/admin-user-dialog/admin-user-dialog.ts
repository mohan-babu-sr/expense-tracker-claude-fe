import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map } from 'rxjs';
import { errorMessage } from '../../../core/interceptors/error.interceptor';
import { skipErrorSnackbar } from '../../../core/interceptors/http-context.tokens';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AdminGroup, AdminUser } from '../../../shared/models';
import { applyServerErrors } from '../../../shared/utils/server-errors';
import { PIN_PATTERN, indianMobile, normalizeMobile } from '../../../shared/utils/validators';

export interface AdminUserDialogData {
  /** Present = edit; absent = add. */
  user?: AdminUser;
  groups: AdminGroup[];
  /** Pre-selected group when adding (e.g. the users list is filtered by a group). */
  groupId?: string;
}

/**
 * Add a user (active at once, with an initial PIN) or change a user's name, mobile or group (R13 AC6).
 * Closes with the saved user.
 */
@Component({
  selector: 'app-admin-user-dialog',
  standalone: false,
  templateUrl: './admin-user-dialog.html',
  styleUrl: './admin-user-dialog.scss',
})
export class AdminUserDialog {
  private readonly data = inject<AdminUserDialogData>(MAT_DIALOG_DATA);
  private readonly admin = inject(AdminService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject<MatDialogRef<AdminUserDialog, AdminUser>>(MatDialogRef);

  protected readonly user = this.data.user;
  protected readonly groups = this.data.groups;
  protected readonly saving = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.user?.name ?? '', [Validators.required, Validators.maxLength(40)]],
    mobile: [this.user?.mobile ?? '', [Validators.required, indianMobile]],
    groupId: [this.user?.groupId ?? this.data.groupId ?? '', Validators.required],
    // Add only (edit uses "Reset PIN"); disabled controls are skipped by validation.
    pin: [{ value: '', disabled: !!this.user }, [Validators.required, Validators.pattern(PIN_PATTERN)]],
  });

  /** Editing: a new mobile or group signs the user out (server bumps tokenVersion) — warn first. */
  protected readonly signsOut = toSignal(
    this.form.valueChanges.pipe(
      map(() => {
        if (!this.user) return false;
        const { mobile, groupId } = this.form.getRawValue();
        return normalizeMobile(mobile) !== this.user.mobile || groupId !== this.user.groupId;
      }),
    ),
    { initialValue: false },
  );
  protected readonly movesGroup = toSignal(
    this.form.controls.groupId.valueChanges.pipe(map((id) => !!this.user && id !== this.user.groupId)),
    { initialValue: false },
  );

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const fields = { name: v.name.trim(), mobile: normalizeMobile(v.mobile), groupId: v.groupId };
    this.saving.set(true);

    const request = this.user
      ? this.admin.updateUser(this.user.id, fields, skipErrorSnackbar())
      : this.admin.createUser({ ...fields, pin: v.pin }, skipErrorSnackbar());

    request.subscribe({
      next: (saved) => {
        this.notification.success(this.user ? `${saved.name} updated` : `${saved.name} added. Tell them their PIN.`);
        this.dialogRef.close(saved);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, err)) this.notification.error(errorMessage(err));
      },
    });
  }
}
