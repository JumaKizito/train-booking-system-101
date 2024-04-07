# README.md

## Overview

This repository contains TypeScript code for a system designed to manage train operations. It facilitates tasks such as adding and retrieving trains, creating tickets, managing operators, and handling user interactions related to train bookings. The system is built on the Internet Computer blockchain.

## Structure

### Data Structures

- **Train**: Represents a train with properties like `id`, `operator`, `name`, `image`, `depatureTime`, `arrivalTime`, `timeTaken`, `price`, `availableSeats`, and `bookedSeats`.
- **Operator**: Represents an operator with properties such as `name`, `principal`, and `phoneNumber`.
- **Ticket**: Represents a ticket with properties including `id`, `trainId`, `userId`, and `numberOfSeats`.
- **User**: Represents a user with properties like `id`, `name`, `phoneNumber`, `email`, and `ticket`.
- **Message**: Variant type representing different error scenarios.

### Storage

- `trainsStorage`: A `StableBTreeMap` to store trains by their IDs.
- `ticketsStorage`: A `StableBTreeMap` to store tickets by their IDs.
- `usersStorage`: A `StableBTreeMap` to store users by their IDs.
- `operatorsStorage`: A `StableBTreeMap` to store operators by their IDs.

### Canister Functions

- **Add Train**: Adds a train to the system.
- **Create Ticket**: Creates a ticket for a user to book a train.
- **Get Trains**: Retrieves all trains from storage.
- **Get Tickets**: Retrieves all tickets from storage.
- **Get Ticket Info**: Retrieves detailed information about a ticket.
- **Add User**: Adds a new user to the system.
- **Get User**: Retrieves a user by their ID.
- **Add Operator**: Adds a new operator to the system.
- **Get Operator**: Retrieves an operator by their name.

### Dependencies

- Utilizes modules from the `"azle"` library for blockchain functionality.
- Relies on IC APIs for blockchain interaction.

### Miscellaneous

- Uses `globalThis.crypto` for generating random values.
- Implements custom correlation IDs for progress tracking.

## Deployment

### Backend Canister

Run `dfx deploy backend` to deploy the backend canister containing the business logic.


