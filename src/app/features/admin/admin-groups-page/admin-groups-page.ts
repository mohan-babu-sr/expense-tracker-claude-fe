import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AdminGroup } from '../../../shared/models';
import { AdminGroupDialog } from '../admin-group-dialog/admin-group-dialog';

/**
 * Admin → Groups (R13 AC6): name, code, member + pending counts; create a group.
 * "Users" opens the users page filtered to that group.
 */
@Component({
  selector: 'app-admin-groups-page',
  standalone: false,
  templateUrl: './admin-groups-page.html',
  styleUrl: './admin-groups-page.scss',
})
export class AdminGroupsPage {
  private readonly admin = inject(AdminService);
  private readonly dialog = inject(MatDialog);

  protected readonly groups = signal<AdminGroup[]>([]);
  protected readonly loaded = signal(false);

  constructor() {
    this.load();
  }

  protected openDialog(): void {
    this.dialog
      .open<AdminGroupDialog, void, AdminGroup>(AdminGroupDialog, {
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  private load(): void {
    this.admin.listGroups().subscribe({
      next: (list) => {
        this.groups.set(list);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true), // snackbar shown by the interceptor
    });
  }
}
