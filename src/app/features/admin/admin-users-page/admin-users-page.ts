import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, combineLatest, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';
import { AdminService, AdminUserAction } from '../../../core/services/admin.service';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { AdminGroup, AdminUser, UserStatus } from '../../../shared/models';
import { AdminUserDialog, AdminUserDialogData } from '../admin-user-dialog/admin-user-dialog';
import { ResetPinDialog } from '../reset-pin-dialog/reset-pin-dialog';

interface StatusInfo {
  label: string;
  icon: string;
}

/** Status shown as icon + text, never colour alone (NFR5). */
export const STATUS_INFO: Record<UserStatus, StatusInfo> = {
  pending: { label: 'Pending', icon: 'hourglass_top' },
  active: { label: 'Active', icon: 'check_circle' },
  disabled: { label: 'Disabled', icon: 'block' },
};

/** What each confirmable action says and does. Approve and Enable need no confirmation. */
const CONFIRM: Partial<Record<AdminUserAction, (u: AdminUser) => { title: string; message: string; confirmText: string }>> = {
  reject: (u) => ({
    title: `Reject ${u.name}?`,
    message: `Their pending account (+91 ${u.mobile}) will be removed. They can register again later.`,
    confirmText: 'Reject',
  }),
  disable: (u) => ({
    title: `Disable ${u.name}?`,
    message: "They'll be signed out and can't sign in until enabled again. Their expenses stay in the group.",
    confirmText: 'Disable',
  }),
};

const DONE: Record<AdminUserAction, (u: AdminUser) => string> = {
  approve: (u) => `${u.name} approved`,
  reject: (u) => `${u.name}'s request rejected`,
  disable: (u) => `${u.name} disabled`,
  enable: (u) => `${u.name} enabled`,
};

/**
 * Admin → Users (R13 AC6): search, filter by status / group, add / edit, reset PIN,
 * approve / reject, disable / enable. Table on laptop, cards on mobile (design §8.5).
 * `?groupId=` (from the Groups page) pre-selects the group filter.
 */
@Component({
  selector: 'app-admin-users-page',
  standalone: false,
  templateUrl: './admin-users-page.html',
  styleUrl: './admin-users-page.scss',
})
export class AdminUsersPage {
  private readonly admin = inject(AdminService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isMobile = inject(LayoutService).isMobile;
  protected readonly statusInfo = STATUS_INFO;
  protected readonly statuses: UserStatus[] = ['pending', 'active', 'disabled'];
  protected readonly columns = ['name', 'mobile', 'group', 'status', 'actions'];

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly status = signal<UserStatus | null>(null);
  protected readonly groupId = signal<string | null>(this.route.snapshot.queryParamMap.get('groupId'));

  protected readonly groups = signal<AdminGroup[]>([]);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly loaded = signal(false);
  /** User whose action is running (disables their buttons). */
  protected readonly busyId = signal<string | null>(null);
  private readonly reload = signal(0);

  /** Debounced, trimmed search text. */
  private readonly searchText = signal('');
  protected readonly hasFilters = computed(() => !!(this.status() || this.groupId() || this.searchText()));

  constructor() {
    this.admin
      .listGroups()
      .pipe(takeUntilDestroyed())
      .subscribe((g) => this.groups.set(g));

    this.search.valueChanges
      .pipe(debounceTime(300), map((q) => q.trim()), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.searchText.set(q));

    // Any filter change (or a reload after an action) → fetch again; switchMap drops stale answers.
    combineLatest([
      toObservable(this.searchText),
      toObservable(this.status),
      toObservable(this.groupId),
      toObservable(this.reload),
    ])
      .pipe(
        switchMap(([q, status, groupId]) =>
          this.admin
            .listUsers({ q, status: status ?? undefined, groupId: groupId ?? undefined })
            .pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        if (list) this.users.set(list);
        this.loaded.set(true);
      });
  }

  protected statusOf(user: AdminUser): StatusInfo {
    return STATUS_INFO[user.status];
  }

  protected goToGroups(): void {
    void this.router.navigateByUrl('/admin/groups');
  }

  protected setGroup(groupId: string | null): void {
    this.groupId.set(groupId);
    // Keep the URL in step so a reload / shared link keeps the filter.
    void this.router.navigate([], { queryParams: { groupId }, replaceUrl: true });
  }

  protected clearFilters(): void {
    this.search.setValue('');
    this.searchText.set('');
    this.status.set(null);
    this.setGroup(null);
  }

  protected openUserDialog(user?: AdminUser): void {
    const data: AdminUserDialogData = { user, groups: this.groups(), groupId: this.groupId() ?? undefined };
    this.dialog
      .open<AdminUserDialog, AdminUserDialogData, AdminUser>(AdminUserDialog, {
        data,
        width: '480px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.refresh());
  }

  protected resetPin(user: AdminUser): void {
    this.dialog
      .open<ResetPinDialog, AdminUser, boolean>(ResetPinDialog, {
        data: user,
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe();
  }

  protected run(user: AdminUser, action: AdminUserAction): void {
    const confirm = CONFIRM[action];
    const confirmed$: Observable<boolean> = confirm ? ConfirmDialog.open(this.dialog, confirm(user)) : of(true);
    confirmed$
      .pipe(
        filter(Boolean),
        tap(() => this.busyId.set(user.id)),
        switchMap(() => this.admin.userAction(user.id, action)),
      )
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.notification.success(DONE[action](user));
          this.refresh();
        },
        error: () => this.busyId.set(null), // the interceptor already showed the message
      });
  }

  /** Users + groups (member / pending counts change with every action). */
  private refresh(): void {
    this.reload.update((n) => n + 1);
    this.admin.listGroups().subscribe((g) => this.groups.set(g));
  }
}
