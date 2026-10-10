import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BookingService, BookingItem } from '../../core/services/booking.service';
import { FeedbackService } from '../../core/services/feedback.service';

@Component({
  selector: 'app-booking-flow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Consultation Bookings</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Schedule high-impact advisory calls and review completed sessions.
        </p>
      </div>

      <!-- Schedule Modal / Card if query parameters present -->
      @if (expertId()) {
        <div class="bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand-500/50 p-6 shadow-lg space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">New Consultation</span>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">Book {{ expertName() || 'Expert' }}</h2>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-400">Agreed Rate</span>
              <div class="text-base font-bold text-slate-800 dark:text-slate-200">\${{ expertRate() }}/hr</div>
            </div>
          </div>

          @if (bookingError()) {
            <div class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {{ bookingError() }}
            </div>
          }

          <form [formGroup]="bookingForm" (ngSubmit)="confirmBooking()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Date & Time</label>
              <input
                type="datetime-local"
                formControlName="scheduledAt"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Session Duration</label>
              <select
                formControlName="durationMin"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
                <option [value]="30">30 minutes</option>
                <option [value]="45">45 minutes</option>
                <option [value]="60">60 minutes</option>
              </select>
            </div>

            <div class="sm:col-span-2 flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                (click)="expertId.set('')"
                class="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="bookingForm.invalid || submittingBooking()"
                class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-500/20 transition flex items-center space-x-2">
                @if (submittingBooking()) {
                  <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Confirming...</span>
                } @else {
                  <span>Confirm Booking (Safe Idempotency)</span>
                }
              </button>
            </div>
          </form>
        </div>
      }

      <!-- All Bookings List -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Your Consultations</h2>
          <span class="text-xs text-slate-500">{{ bookings().length }} total</span>
        </div>

        @if (loadingBookings()) {
          <div class="p-8 text-center text-sm text-slate-500">Loading your consultations...</div>
        } @else if (bookings().length === 0) {
          <div class="p-12 text-center">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">No bookings yet</h3>
            <p class="text-xs text-slate-500 mt-1 mb-4">Post a query and book ranked experts directly from your matches.</p>
            <a routerLink="/queries/create" class="inline-block px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold">Post a Query</a>
          </div>
        } @else {
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (booking of bookings(); track booking.id) {
              <div class="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <div class="space-y-1">
                  <div class="flex items-center space-x-2">
                    <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                          [class.bg-emerald-100]="booking.status === 'CONFIRMED'"
                          [class.text-emerald-700]="booking.status === 'CONFIRMED'"
                          [class.bg-amber-100]="booking.status === 'PENDING'"
                          [class.text-amber-700]="booking.status === 'PENDING'"
                          [class.bg-slate-100]="booking.status === 'COMPLETED'"
                          [class.text-slate-700]="booking.status === 'COMPLETED'"
                          [class.bg-red-100]="booking.status === 'CANCELLED'"
                          [class.text-red-700]="booking.status === 'CANCELLED'">
                      {{ booking.status }}
                    </span>
                    <span class="text-xs text-slate-500">• {{ booking.scheduledAt | date:'medium' }}</span>
                  </div>
                  <div class="text-sm font-bold text-slate-900 dark:text-white">
                    {{ booking.durationMin }} Minutes Advisory Consultation
                  </div>
                  <div class="text-xs text-slate-500">
                    Rate: \${{ booking.ratePerHourUsd }}/hr • Booking ID: <span class="font-mono">{{ booking.id.slice(0, 8) }}</span>
                  </div>
                </div>

                <div class="flex items-center space-x-2 flex-shrink-0">
                  @if (booking.status === 'PENDING') {
                    <button
                      type="button"
                      (click)="updateStatus(booking.id, 'CANCELLED')"
                      class="px-3 py-1.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 text-xs font-semibold rounded-lg transition">
                      Cancel
                    </button>
                  }
                  @if (booking.status === 'CONFIRMED') {
                    <button
                      type="button"
                      (click)="updateStatus(booking.id, 'COMPLETED')"
                      class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition">
                      Mark Completed
                    </button>
                  }
                  @if (booking.status === 'COMPLETED') {
                    <button
                      type="button"
                      (click)="openReviewModal(booking)"
                      class="px-3 py-1.5 bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 text-xs font-semibold rounded-lg border border-brand-200 dark:border-brand-800 transition">
                      ★ Leave Review
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Consultation Review Modal -->
      @if (reviewBooking()) {
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Review Consultation</h3>
              <button type="button" (click)="reviewBooking.set(null)" class="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Expert Rating</label>
                <div class="flex space-x-2 text-2xl cursor-pointer">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <span
                      (click)="selectedStars.set(star)"
                      [class.text-amber-400]="star <= selectedStars()"
                      [class.text-slate-300]="star > selectedStars()">
                      ★
                    </span>
                  }
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Feedback & Notes</label>
                <textarea
                  #reviewText
                  rows="3"
                  placeholder="How valuable was this session? Were the recommendations actionable?"
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"></textarea>
              </div>

              <div class="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  (click)="reviewBooking.set(null)"
                  class="px-3 py-1.5 text-xs text-slate-500">
                  Cancel
                </button>
                <button
                  type="button"
                  (click)="submitReview(reviewText.value)"
                  class="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold">
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class BookingFlowComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private bookingService = inject(BookingService);
  private feedbackService = inject(FeedbackService);

  public bookings = signal<BookingItem[]>([]);
  public loadingBookings = signal<boolean>(true);
  public submittingBooking = signal<boolean>(false);
  public bookingError = signal<string | null>(null);

  public queryId = signal<string>('');
  public expertId = signal<string>('');
  public expertName = signal<string>('');
  public expertRate = signal<number>(300);

  public reviewBooking = signal<BookingItem | null>(null);
  public selectedStars = signal<number>(5);

  public bookingForm = this.fb.group({
    scheduledAt: ['', [Validators.required]],
    durationMin: [45, [Validators.required]]
  });

  public ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['expertId']) {
        this.expertId.set(params['expertId']);
        this.queryId.set(params['queryId'] || '');
        this.expertName.set(params['name'] || '');
        this.expertRate.set(Number(params['rate']) || 300);
        // Default scheduled time to tomorrow 2:00 PM
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(14, 0, 0, 0);
        this.bookingForm.patchValue({
          scheduledAt: d.toISOString().slice(0, 16)
        });
      }
    });

    this.loadBookings();
  }

  private loadBookings(): void {
    this.bookingService.getBookings().subscribe({
      next: (list: BookingItem[]) => {
        this.bookings.set(list || []);
        this.loadingBookings.set(false);
      },
      error: () => this.loadingBookings.set(false)
    });
  }

  public confirmBooking(): void {
    if (this.bookingForm.invalid) return;
    this.submittingBooking.set(true);
    this.bookingError.set(null);

    const val = this.bookingForm.getRawValue();
    const idempotencyKey = crypto.randomUUID();

    this.bookingService.createBooking({
      queryId: this.queryId(),
      expertId: this.expertId(),
      scheduledAt: new Date(val.scheduledAt!).toISOString(),
      durationMin: Number(val.durationMin),
      ratePerHourUsd: this.expertRate()
    }, idempotencyKey).subscribe({
      next: () => {
        this.submittingBooking.set(false);
        this.expertId.set(''); // close booking card
        this.loadBookings();
      },
      error: (err) => {
        this.submittingBooking.set(false);
        if (err?.status === 409) {
          this.bookingError.set('Double-booking conflict: This expert has already been booked for that time slot. Please select a different time.');
        } else {
          this.bookingError.set(err?.error?.message || 'Failed to create booking.');
        }
      }
    });
  }

  public updateStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'): void {
    this.bookingService.updateStatus(id, status).subscribe({
      next: () => this.loadBookings()
    });
  }

  public openReviewModal(b: BookingItem): void {
    this.reviewBooking.set(b);
    this.selectedStars.set(5);
  }

  public submitReview(notes: string): void {
    const b = this.reviewBooking();
    if (!b) return;

    this.feedbackService.submitConsultationFeedback({
      bookingId: b.id,
      rating: this.selectedStars(),
      review: notes,
      outcomeNotes: notes
    }).subscribe({
      next: () => {
        this.reviewBooking.set(null);
        this.loadBookings();
      }
    });
  }
}
