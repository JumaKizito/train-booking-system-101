import {
  query,
  update,
  text,
  Record,
  StableBTreeMap,
  Variant,
  Vec,
  Ok,
  Err,
  ic,
  Opt,
  None,
  Some,
  Principal,
  Duration,
  nat64,
  Result,
  Canister,
} from "azle";

import { v4 as uuidv4 } from "uuid";

const Operator = Record({
  name: text,
  principal: Principal,
  phoneNumber: text,
});

const Train = Record({
  id: text,
  operator: Operator,
  name: text,
  image: text,
  depatureTime: text,
  arrivalTime: text,
  timeTaken: text,
  price: nat64,
  availableSeats: nat64,
  bookedSeats: nat64,
});

const TrainPayload = Record({
  name: text,
  image: text,
  depatureTime: text,
  arrivalTime: text,
  timeTaken: text,
  price: nat64,
  availableSeats: nat64,
});

const OperatorPayload = Record({
  name: text,
  address: text,
  phoneNumber: text,
});

const Ticket = Record({
  id: text,
  trainId: text,
  userId: text,
  numberOfSeats: text,
});

const TicketPayload = Record({
  trainId: text,
  userId: text,
  numberOfSeats: text,
});

const TicketInfo = Record({
  id: text,
  trainId: text,
  userId: text,
  depatureTime: text,
  arrivalTime: text,
  timeTaken: text,
  price: nat64,
  userName: text,
  userPhoneNumber: text,
});

const User = Record({
  id: text,
  name: text,
  phoneNumber: text,
  email: text,
  ticket: Vec(text),
});

const UserPayload = Record({
  name: text,
  phoneNumber: text,
  email: text,
});

const CancelTicket = Record({
  ticketId: text,
  userId: text,
});

const cancelTicketPayload = Record({
  ticketId: text,
  userId: text,
});

const Message = Variant({
  NotFound: text,
  InvalidPayload: text,
  PaymentFailed: text,
  PaymentCompleted: text,
});

/**
 * `loansStorage` - a key-value data structure used to store loans by borrowers.
 * {@link StableBTreeMap} is a self-balancing tree that acts as durable data storage across canister upgrades.
 * For this contract, `StableBTreeMap` is chosen for the following reasons:
 * - `insert`, `get`, and `remove` operations have constant time complexity (O(1)).
 * - Data stored in the map survives canister upgrades, unlike using HashMap where data is lost after an upgrade.
 *
 * Breakdown of the `StableBTreeMap(text, Loan)` data structure:
 * - The key of the map is an `loanId`.
 * - The value in this map is an loan (`Loan`) related to a given key (`loanId`).
 *
 * Constructor values:
 * 1) 0 - memory id where to i// get borrower with the same principal
    const borrowerOpt = borrowersStorage.values().filter((borrower) => {
      return borrower.principal.toText() === ic.caller().toText();
    });

    const borrower = borrowerOpt[0];nitialize a map.
 * 2) 16 - maximum size of the key in bytes.
 * 3) 1024 - maximum size of the value in bytes.
 * Values 2 and 3 are not used directly in the constructor but are utilized by the Azle compiler during compile time.
 */

const trainsStorage = StableBTreeMap(0, text, Train);
const ticketsStorage = StableBTreeMap(1, text, Ticket);
const usersStorage = StableBTreeMap(2, text, User);
const operatorsStorage = StableBTreeMap(3, text, Operator);

// const PAYMENT_RESERVATION_PERIOD = 120n; // reservation period in seconds

// const icpCanister = Ledger(Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"));

export default Canister({
  addTrain: update([TrainPayload], Result(Train, Message), (payload) => {
  if (typeof payload !== "object" || Object.keys(payload).length === 0) {
    return Err({ NotFound: "invalid payoad" });
  }

    const trainOpt = trainsStorage.get(payload.name);
    if ("Some" in trainOpt) {
      return Err({
        InvalidPayload: `Train with name ${payload.name} already exists`,
      });
    }

    const operatorOpt = operatorsStorage.values().filter((operator) => {
      return operator.principal.toText() === ic.caller().toText();
    });

    const operator = operatorOpt[0];

    const train = {
      id: uuidv4(),
      operator: operator,
      bookedSeats: 0n,
      ...payload,
    };

    //add train to the storage
    trainsStorage.insert(train.id, train);
    return Ok(train);
  }),

  getTrains: query([], Vec(Train), () => {
    return trainsStorage.values();
  }),

  //getTrain
  getTrain: query([text], Result(Train, Message), (trainId) => {
    const trainOpt = trainsStorage.get(trainId);
    if ("None" in trainOpt) {
      return Err({ NotFound: `Train with id ${trainId} not found` });
    }
    return Ok(trainOpt.Some);
  }),

  //createTicket
  createTicket: update(
    [TicketPayload],
    Result(TicketInfo, Message),
    (payload) => {
      const userOpt = usersStorage.get(payload.userId);
      if ("None" in userOpt) {
        return Err({ NotFound: `User with id ${payload.userId} not found` });
      }

      const trainOpt = trainsStorage.get(payload.trainId);
      if ("None" in trainOpt) {
        return Err({ NotFound: `Train with id ${payload.trainId} not found` });
      }
      const train = trainOpt.Some;
      const user = userOpt.Some;
      const ticketId = uuidv4();
      const ticket = {
        id: ticketId,
        userId: user.id,
        trainId: train.id,
        numberOfSeats: payload.numberOfSeats,
      };

      const ticketInfo = {
        id: ticketId,
        trainId: train.id,
        userId: user.id,
        depatureTime: train.depatureTime,
        arrivalTime: train.arrivalTime,
        timeTaken: train.timeTaken,
        price: train.price,
        userName: user.name,
        userPhoneNumber: user.phoneNumber,
      };

      //check if train has departed
      const currentTime = new Date().getTime();
      const depatureTime = new Date(train.depatureTime).getTime();
      if (currentTime > depatureTime) {
        return Err({
          InvalidPayload: `Train with id ${train.id} has already departed`,
        });
      }

      //check if the user has already booked a ticket for the same train
      if (user.ticket.includes(ticketId)) {
        return Err({
          InvalidPayload: `User with id ${user.id} already booked a ticket for train ${train.id}`,
        });
      }

      //check if there are available seats
      if (train.availableSeats <= train.bookedSeats) {
        return Err({
          InvalidPayload: `No available seats for train ${train.id}`,
        });
      }

      //update train booked seats 
      train.bookedSeats += BigInt(payload.numberOfSeats);

      //update no of available seats
      train.availableSeats -= BigInt(payload.numberOfSeats);

      //update train in storage
      trainsStorage.insert(train.id, train);

      //insert ticket into storage
      ticketsStorage.insert(ticket.id, ticket);

      //insert ticket into users storage
      user.ticket.push(ticket.id);
      usersStorage.insert(user.id, user);

      return Ok(ticketInfo);
    }
  ),
  //getTickets
  getTickets: query([], Vec(Ticket), () => {
    return ticketsStorage.values();
  }),

  //getTicketInfo
  getTicketInfo: query([text], Result(TicketInfo, Message), (ticketId) => {
    const ticketOpt = ticketsStorage.get(ticketId);
    if ("None" in ticketOpt) {
      return Err({ NotFound: `Ticket with id ${ticketId} not found` });
    }
    const ticket = ticketOpt.Some;

    const trainOpt = trainsStorage.get(ticket.trainId);
    if ("None" in trainOpt) {
      return Err({ NotFound: `Train with id ${ticket.trainId} not found` });
    }
    const train = trainOpt.Some;

    const userOpt = usersStorage.get(ticket.userId);
    if ("None" in userOpt) {
      return Err({ NotFound: `User with id ${ticket.userId} not found` });
    }
    const user = userOpt.Some;

    const ticketInfo = {
      id: ticket.id,
      trainId: train.id,
      userId: user.id,
      depatureTime: train.depatureTime,
      arrivalTime: train.arrivalTime,
      timeTaken: train.timeTaken,
      price: train.price,
      userName: user.name,
      userPhoneNumber: user.phoneNumber,
    };

    return Ok(ticketInfo);
  }),


  //addUser
  addUser: update([UserPayload], Result(User, Message), (payload) => {
    if (typeof payload !== "object" || Object.keys(payload).length === 0) {
      return Err({ NotFound: "invalid payoad" });
    }

    const user = {
      id: uuidv4(),
      ticket: [],
      ...payload,
    };
    //insert into storage
    usersStorage.insert(user.id, user);
    return Ok(user);
  }),

  //getUser
  getUser: query([text], Opt(User), (userId) => {
    return usersStorage.get(userId);
  }),

  //getUsers
  getUsers: query([], Vec(User), () => {
    return usersStorage.values();
  }),

  //addOperator
  addOperator: update([OperatorPayload], Result(Operator, Message), (payload) => {


    const operator = {
      principal: ic.caller(),
      ...payload,
    };

    operatorsStorage.insert(operator.name, operator);
    return Ok(operator);
  }),

  //getOperator
  getOperator: query([text], Result(Operator, Message), (operatorName) => {
    const operatorOpt = operatorsStorage.get(operatorName);
    if ("None" in operatorOpt) {
      return Err({ NotFound: `Operator with name ${operatorName} not found` });
    }
    return Ok(operatorOpt.Some);
  }),

  //getOperators
  getOperators: query([], Vec(Operator), () => {
    return operatorsStorage.values();
  }),

  //cancelTicket
  cancelTicket: update(
    [cancelTicketPayload],
    Result(CancelTicket, Message),
    (payload) => {
      const ticketOpt = ticketsStorage.get(payload.ticketId);
      if ("None" in ticketOpt) {
        return Err({ NotFound: `Ticket with id ${payload.ticketId} not found` });
      }
      const ticket = ticketOpt.Some;

      const userOpt = usersStorage.get(payload.userId);
      if ("None" in userOpt) {
        return Err({ NotFound: `User with id ${payload.userId} not found` });
      }
      const user = userOpt.Some;

      const trainOpt = trainsStorage.get(ticket.trainId);
      if ("None" in trainOpt) {
        return Err({ NotFound: `Train with id ${ticket.trainId} not found` });
      }
      const train = trainOpt.Some;


      //update train booked seats 
      train.bookedSeats -= BigInt(ticket.numberOfSeats);

      //update no of available seats
      train.availableSeats += BigInt(ticket.numberOfSeats);

      //update train in storage
      //trainsStorage.insert(train.id, train);

  //remove ticket from user
      user.ticket = user.ticket.filter((ticketId: any) => ticketId !== ticket.id);
      usersStorage.insert(user.id, user);

      //remove ticket from storage
      ticketsStorage.remove(ticket.id);

      return Ok({ ticketId: ticket.id, userId: user.id });
    }
  ),
  

});


// a workaround to make uuid package work with Azle
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};