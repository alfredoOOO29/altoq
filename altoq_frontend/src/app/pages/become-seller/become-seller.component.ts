import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreAssistantComponent } from '../../components/store-assistant/store-assistant.component';

@Component({
  selector: 'app-become-seller',
  standalone: true,
  imports: [CommonModule, StoreAssistantComponent],
  templateUrl: './become-seller.component.html',
  styleUrls: ['./become-seller.component.css']
})
export class BecomeSellerComponent {
  constructor(private router: Router) {}

  onCancel(): void {
    this.router.navigate(['/profile']);
  }
}
